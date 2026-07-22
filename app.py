from __future__ import annotations

import pandas as pd
import streamlit as st

from data_parser import classify_rows, parse_uploaded_file
from lib.ai_advisor import (
    build_period_advice,
    detect_categorization_issues,
    enhance_with_llm,
    explain_category_change,
)
from lib.analyzer import AnalysisResult, analyze_transactions
from lib.categorization import (
    apply_merchant_categories,
    get_known_expense_categories,
    get_unknown_merchants,
)
from lib.city_benchmarks import compare_to_reference, list_cities
from lib.health_score import calculate_health_score
from lib.period_analyzer import compare_periods
from lib.records import editor_to_classified_df, period_to_editor_df
from ui_theme import (
    expense_bar_chart,
    health_score_gauge,
    income_pie_chart,
    inject_styles,
    period_comparison_chart,
    render_hero,
    render_insight_list,
    render_metric_card,
    render_section_title,
)

st.set_page_config(page_title="Cost & Income Analyzer", page_icon="📊", layout="wide")

PRIVACY_NOTICE = (
    "Your data stays private. Uploads are processed only in this browser session "
    "and are never saved to disk or a database."
)


def classify_periods(periods: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    return {name: classify_rows(df) for name, df in periods.items()}


def format_currency(value: float) -> str:
    return f"${value:,.2f}"


def category_table(items: list, include_expense_pct: bool) -> pd.DataFrame:
    rows = []
    for item in items:
        row = {
            "Category": item.category,
            "Total": item.total,
            "Transactions": item.count,
            "% out of total income": item.pct_of_income,
        }
        if include_expense_pct:
            row["% out of total expenses"] = item.pct_of_expenses
        rows.append(row)
    return pd.DataFrame(rows)


def init_session_state() -> None:
    defaults = {
        "upload_key": None,
        "periods": {},
        "selected_period": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def load_upload(uploaded_file) -> None:
    upload_key = f"{uploaded_file.name}:{uploaded_file.size}"
    if st.session_state.upload_key == upload_key:
        return

    try:
        parsed_periods = parse_uploaded_file(uploaded_file)
        st.session_state.periods = classify_periods(parsed_periods)
        st.session_state.upload_key = upload_key
        st.session_state.selected_period = list(st.session_state.periods.keys())[-1]
    except ValueError as error:
        st.error(str(error))
        st.stop()
    except Exception:
        st.error("Could not read the file. Upload a valid .csv or .xlsx file.")
        st.stop()


def render_privacy_banner() -> None:
    pass


def render_upload_help() -> None:
    with st.expander("How to prepare your file", expanded=False):
        st.markdown(
            """
**Single period**
- Upload one CSV or one Excel tab with: `Merchant`, `Category`, `Amount`
- Optional column: `Date`

**Multiple periods**
- Upload an Excel file with one tab per period (e.g. `January`, `February`)
- Or one CSV with a `Period` column
- Or one CSV with `Date` values across multiple months (auto-split by month)

**Income examples:** Salary, Pension, Investment Income  
**Expense examples:** Rent, Groceries, Restaurants, Transport
            """
        )


def render_unknown_categorization(period_name: str, df: pd.DataFrame) -> pd.DataFrame:
    unknown_merchants = get_unknown_merchants(df)
    if unknown_merchants.empty:
        return df

    known_categories = get_known_expense_categories(df)
    if not known_categories:
        st.warning("Add at least one known expense category before re-categorizing Unknown merchants.")
        return df

    st.markdown("#### Unknown merchants")
    assignments: dict[str, str] = {}
    with st.form(f"unknown_form_{period_name}"):
        for row in unknown_merchants.itertuples(index=False):
            left, right = st.columns([2, 1])
            with left:
                st.markdown(f"**{row.merchant_name}** — {format_currency(row.total)}")
            with right:
                assignments[row.merchant_name] = st.selectbox(
                    "Category",
                    known_categories,
                    key=f"unknown_{period_name}_{row.merchant_name}",
                    label_visibility="collapsed",
                )
        if st.form_submit_button("Apply unknown categorization"):
            updated = apply_merchant_categories(df, assignments)
            st.session_state.periods[period_name] = updated
            st.rerun()
    return df


def render_record_editor() -> None:
    st.subheader("Review and edit records")
    st.caption("Add, remove, or change rows before running the analysis.")

    period_names = list(st.session_state.periods.keys())
    editor_period = st.selectbox("Period to edit", period_names, key="editor_period")

    editor_df = period_to_editor_df(st.session_state.periods[editor_period])
    edited = st.data_editor(
        editor_df,
        num_rows="dynamic",
        use_container_width=True,
        key=f"editor_{editor_period}",
    )

    if st.button("Save record changes", type="primary"):
        try:
            st.session_state.periods[editor_period] = editor_to_classified_df(edited, editor_period)
            st.success(f"Saved changes for {editor_period}.")
            st.rerun()
        except Exception as error:
            st.error(f"Could not save changes: {error}")


def render_ai_categorization_review() -> None:
    st.subheader("AI categorization check")
    flags = detect_categorization_issues(st.session_state.periods)
    if not flags:
        st.success("No unusual categorizations detected.")
        return

    st.caption("Review flagged rows and confirm or update the category.")
    decisions: dict[tuple[str, int], str] = {}

    for flag in flags:
        with st.container(border=True):
            st.markdown(
                f"**{flag.period}** — {flag.merchant_name} ({format_currency(flag.amount)})  \n"
                f"Current: `{flag.current_category}` → Suggested: `{flag.suggested_category}`  \n"
                f"{flag.reason}"
            )
            choice = st.radio(
                "Is this categorization correct?",
                ["Keep current category", f"Change to {flag.suggested_category}"],
                key=f"flag_{flag.period}_{flag.row_id}",
                horizontal=True,
            )
            if choice.startswith("Change"):
                decisions[(flag.period, flag.row_id)] = flag.suggested_category

    if decisions and st.button("Apply categorization fixes"):
        from lib.records import apply_flag_decisions

        st.session_state.periods = apply_flag_decisions(st.session_state.periods, decisions)
        st.rerun()


def render_summary(result: AnalysisResult) -> None:
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        render_metric_card("Total Income", format_currency(result.total_income), "metric-income")
    with col2:
        render_metric_card("Total Expenses", format_currency(result.total_expenses), "metric-expense")
    with col3:
        render_metric_card("Net Savings", format_currency(result.net_savings), "metric-savings")
    with col4:
        render_metric_card("Savings Rate", f"{result.savings_rate:.1f}%", "metric-rate")


def render_charts(result: AnalysisResult) -> None:
    left, right = st.columns(2)
    if result.income_categories:
        income_df = pd.DataFrame(
            {
                "Category": [i.category for i in result.income_categories],
                "Amount": [i.total for i in result.income_categories],
            }
        )
        with left:
            st.plotly_chart(income_pie_chart(income_df), use_container_width=True)
    if result.expense_categories:
        expense_df = pd.DataFrame(
            {
                "Category": [i.category for i in result.expense_categories],
                "Amount": [i.total for i in result.expense_categories],
            }
        )
        with right:
            st.plotly_chart(expense_bar_chart(expense_df), use_container_width=True)


def render_tables(result: AnalysisResult) -> None:
    income_tab, expense_tab, merchant_tab = st.tabs(["Income", "Expenses", "Top merchants"])
    with income_tab:
        if result.income_categories:
            st.dataframe(category_table(result.income_categories, False), hide_index=True, use_container_width=True)
    with expense_tab:
        if result.expense_categories:
            st.dataframe(category_table(result.expense_categories, True), hide_index=True, use_container_width=True)
    with merchant_tab:
        if result.top_merchants:
            st.dataframe(
                pd.DataFrame(
                    {
                        "Merchant": [m.merchant_name for m in result.top_merchants],
                        "Category": [m.category for m in result.top_merchants],
                        "Total": [m.total for m in result.top_merchants],
                    }
                ),
                hide_index=True,
                use_container_width=True,
            )


def render_single_period_dashboard(period_name: str, df: pd.DataFrame) -> None:
    render_section_title(f"Dashboard — {period_name}", "Overview of income, spending, and insights")
    result = analyze_transactions(df)
    render_summary(result)
    st.markdown("<div style='height: 0.6rem'></div>", unsafe_allow_html=True)
    render_charts(result)
    render_tables(result)
    render_section_title("Insights")
    render_insight_list(result.insights)


def render_multi_period_dashboard() -> None:
    periods = st.session_state.periods
    render_section_title("Multi-period comparison", "Track how income and spending change over time")

    period_names = list(periods.keys())
    summary_rows = []
    for name in period_names:
        result = analyze_transactions(periods[name])
        summary_rows.append(
            {
                "Period": name,
                "Income": result.total_income,
                "Expenses": result.total_expenses,
                "Net Savings": result.net_savings,
                "Savings Rate %": round(result.savings_rate, 1),
            }
        )
    summary_df = pd.DataFrame(summary_rows)
    st.dataframe(summary_df, hide_index=True, use_container_width=True)

    chart_df = summary_df.melt(
        id_vars=["Period"],
        value_vars=["Income", "Expenses", "Net Savings"],
        var_name="Metric",
        value_name="Amount",
    )
    st.plotly_chart(period_comparison_chart(chart_df), use_container_width=True)

    if len(period_names) >= 2:
        comparison = compare_periods(
            periods[period_names[-2]],
            periods[period_names[-1]],
            period_names[-2],
            period_names[-1],
        )
        render_section_title(
            f"Latest change: {comparison.previous_period} → {comparison.current_period}"
        )
        change_insights = [
            (
                f"Income {comparison.income_change:+,.2f} ({comparison.income_change_pct:+.1f}%), "
                f"Expenses {comparison.expense_change:+,.2f} ({comparison.expense_change_pct:+.1f}%)"
            )
        ]
        change_insights.extend(explain_category_change(change) for change in comparison.category_changes[:10])
        render_insight_list(change_insights)


def render_ai_advisor() -> None:
    render_section_title("AI financial advisor", "Health score and explanations for category changes")
    periods = st.session_state.periods
    period_names = list(periods.keys())
    comparison = None
    if len(period_names) >= 2:
        comparison = compare_periods(
            periods[period_names[-2]],
            periods[period_names[-1]],
            period_names[-2],
            period_names[-1],
        )

    health = calculate_health_score(periods)
    left, right = st.columns([1, 1.2])
    with left:
        st.plotly_chart(health_score_gauge(health.overall, health.summary), use_container_width=True)
    with right:
        render_insight_list(health.details)

    advice = build_period_advice(periods, comparison)
    render_section_title("Category and period explanations")
    render_insight_list(advice[1:])

    llm_prompt = (
        "You are a concise personal finance advisor. Summarize these findings in plain language "
        f"with 5 bullet points:\n{chr(10).join(advice)}"
    )
    llm_summary = enhance_with_llm(llm_prompt)
    if llm_summary:
        st.markdown("#### Enhanced AI summary")
        st.write(llm_summary)
    else:
        st.caption("Optional: set OPENAI_API_KEY in your environment for richer AI summaries.")


def render_location_comparison() -> None:
    st.subheader("Location comparison")
    periods = st.session_state.periods
    period_names = list(periods.keys())

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        base_city = st.selectbox("Your base location", list_cities(), key="base_city")
    with col2:
        reference_options = [city for city in list_cities() if city != base_city]
        reference_city = st.selectbox("Reference location", reference_options, key="reference_city")
    with col3:
        compare_period = st.selectbox(
            "Period or interval",
            ["All periods"] + period_names,
            key="compare_period",
        )
    with col4:
        household_size = st.selectbox("Household size", [1, 2, 3, 4, 5], key="household_size")

    if compare_period == "All periods":
        combined = pd.concat(periods.values(), ignore_index=True)
        combined = combined.groupby(
            ["merchant_name", "category", "transaction_type"], as_index=False
        ).agg(amount=("amount", "sum"), abs_amount=("abs_amount", "sum"))
        combined["date"] = pd.NaT
        combined["period"] = "All periods"
        analysis_df = combined
        label = "all uploaded periods"
    else:
        analysis_df = periods[compare_period]
        label = compare_period

    st.caption(
        f"Comparing your spending in **{base_city}** against average costs in **{reference_city}** "
        f"for **{household_size}** {'person' if household_size == 1 else 'people'} during **{label}**."
    )

    comparisons = compare_to_reference(analysis_df, reference_city, household_size)
    if not comparisons:
        st.info("No matching expense categories found for location comparison.")
        return

    rows = []
    for item in comparisons:
        rows.append(
            {
                "Category": item.category,
                "Your spending": item.user_amount,
                "Reference average": item.reference_amount,
                "Difference": item.difference,
                "Difference %": round(item.difference_pct, 1),
                "Status": item.status,
            }
        )
    st.dataframe(pd.DataFrame(rows), hide_index=True, use_container_width=True)


def main() -> None:
    init_session_state()
    inject_styles()
    render_hero()
    render_upload_help()

    uploaded_file = st.file_uploader(
        "Upload CSV or Excel file",
        type=["csv", "xlsx"],
        help="Use sample_transactions.csv from the project folder to try the app.",
    )
    if uploaded_file is None:
        st.info("Upload a file to begin. Try `sample_transactions.csv` in the project folder.")
        return

    load_upload(uploaded_file)
    periods = st.session_state.periods
    period_names = list(periods.keys())
    st.success(f"Loaded {len(period_names)} period(s): {', '.join(period_names)}")

    tabs = st.tabs(
        [
            "Review & Edit",
            "AI Categorization",
            "Dashboard",
            "AI Advisor",
            "Location Compare",
        ]
    )

    with tabs[0]:
        for period_name in period_names:
            periods[period_name] = render_unknown_categorization(period_name, periods[period_name])
            st.session_state.periods[period_name] = periods[period_name]
        render_record_editor()

    with tabs[1]:
        render_ai_categorization_review()

    with tabs[2]:
        if len(period_names) == 1:
            render_single_period_dashboard(period_names[0], periods[period_names[0]])
        else:
            selected = st.selectbox("View one period", period_names, key="dashboard_period")
            render_single_period_dashboard(selected, periods[selected])
            render_multi_period_dashboard()

    with tabs[3]:
        render_ai_advisor()

    with tabs[4]:
        render_location_comparison()


if __name__ == "__main__":
    main()
