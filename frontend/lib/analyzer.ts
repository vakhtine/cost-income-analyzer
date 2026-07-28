import {
  filterExpenseTransactions,
  filterIncomeTransactions,
  isExpenseTransaction,
} from "@/lib/transaction-filters";
import { CategorySummary, MerchantSummary, PeriodAnalysis, Transaction } from "@/lib/types";
import { round2 } from "@/lib/utils";

function groupExpenseCategories(rows: Transaction[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of filterExpenseTransactions(rows)) {
    const current = map.get(row.category) ?? { total: 0, count: 0 };
    current.total += row.abs_amount;
    current.count += 1;
    map.set(row.category, current);
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.total - a.total);
}

function groupIncomeCategories(rows: Transaction[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of filterIncomeTransactions(rows)) {
    const current = map.get(row.category) ?? { total: 0, count: 0 };
    current.total += row.abs_amount;
    current.count += 1;
    map.set(row.category, current);
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.total - a.total);
}

function detectUnusual(expenseCategories: CategorySummary[]) {
  if (expenseCategories.length < 2) return [];
  const totals = expenseCategories.map((item) => item.total);
  const avg = totals.reduce((sum, value) => sum + value, 0) / totals.length;
  const variance =
    totals.reduce((sum, value) => sum + (value - avg) ** 2, 0) / totals.length;
  const std = Math.sqrt(variance);
  const threshold = Math.max(avg * 1.5, avg + std);
  return expenseCategories.filter((item) => item.total >= threshold);
}

export function analyzeTransactions(rows: Transaction[]): PeriodAnalysis {
  const incomeRows = filterIncomeTransactions(rows);
  const expenseRows = filterExpenseTransactions(rows);
  const total_income = round2(incomeRows.reduce((sum, row) => sum + row.abs_amount, 0));
  const expenseGroups = groupExpenseCategories(rows);
  const total_expenses = round2(expenseGroups.reduce((sum, item) => sum + item.total, 0));
  const net_savings = round2(total_income - total_expenses);
  const savings_rate = total_income ? round2((net_savings / total_income) * 100) : 0;

  const income_categories: CategorySummary[] = groupIncomeCategories(rows).map((item) => ({
    category: item.category,
    total: round2(item.total),
    count: item.count,
    pct_of_income: total_income ? round2((item.total / total_income) * 100) : 0,
    pct_of_expenses: null,
  }));

  const expense_categories: CategorySummary[] = expenseGroups.map((item) => ({
    category: item.category,
    total: round2(item.total),
    count: item.count,
    pct_of_income: total_income ? round2((item.total / total_income) * 100) : 0,
    pct_of_expenses: total_expenses ? round2((item.total / total_expenses) * 100) : 0,
  }));

  const merchantMap = new Map<string, MerchantSummary>();
  for (const row of expenseRows) {
    const key = `${row.merchant_name}::${row.category}`;
    const current = merchantMap.get(key) ?? {
      merchant_name: row.merchant_name,
      category: row.category,
      total: 0,
    };
    current.total += row.abs_amount;
    merchantMap.set(key, current);
  }
  const top_merchants = [...merchantMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((item) => ({ ...item, total: round2(item.total) }));

  const unusual_expenses = detectUnusual(expense_categories);
  const insights: string[] = [];
  if (!total_income) {
    insights.push("No income categories were found. Add rows with categories like Salary or Pension.");
  }
  if (!total_expenses) insights.push("No expense categories were found.");
  if (total_income && total_expenses) {
    if (savings_rate >= 20) {
      insights.push(`You are saving ${savings_rate.toFixed(1)}% of income, which is a healthy rate.`);
    } else if (savings_rate >= 0) {
      insights.push(`You are saving ${savings_rate.toFixed(1)}% of income. Consider targeting 20% or more.`);
    } else {
      insights.push(
        `Expenses exceed income by $${Math.abs(net_savings).toFixed(2)}. Review your largest spending categories.`
      );
    }
  }
  if (expense_categories[0]) {
    const largest = expense_categories[0];
    insights.push(
      `Largest expense category is ${largest.category} at $${largest.total.toFixed(2)} (${largest.pct_of_expenses?.toFixed(1)}% of expenses, ${largest.pct_of_income.toFixed(1)}% of income).`
    );
  }
  for (const item of unusual_expenses.slice(0, 3)) {
    insights.push(
      `${item.category} looks unusually high at $${item.total.toFixed(2)} (${item.pct_of_expenses?.toFixed(1)}% of total expenses).`
    );
  }

  return {
    total_income,
    total_expenses,
    net_savings,
    savings_rate,
    income_categories,
    expense_categories,
    top_merchants,
    unusual_expenses,
    insights,
  };
}

export function expenseCategoryTotal(rows: Transaction[], category: string) {
  return round2(
    rows
      .filter((row) => isExpenseTransaction(row) && row.category === category)
      .reduce((sum, row) => sum + row.abs_amount, 0)
  );
}
