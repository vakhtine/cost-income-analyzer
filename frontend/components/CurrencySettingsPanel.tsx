"use client";

import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";

export function CurrencySettingsPanel() {
  const {
    settings,
    ratesDate,
    ratesLoading,
    ratesError,
    setIncomeCurrency,
    setExpenseCurrency,
    setDisplayCurrency,
    refreshRates,
  } = useCurrency();

  return (
    <section className="card currency-settings-panel">
      <div className="section-heading">
        <h3>Currency settings</h3>
        <p>
          Set the currency your income and expenses are recorded in, then choose a display
          currency for converted totals. Rates update from live ECB data
          {ratesDate && ratesDate !== "fallback" ? ` (${ratesDate})` : ""}.
        </p>
      </div>

      <div className="currency-settings-grid">
        <label>
          Income currency
          <select
            value={settings.incomeCurrency}
            onChange={(event) => setIncomeCurrency(event.target.value as typeof settings.incomeCurrency)}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Expense currency
          <select
            value={settings.expenseCurrency}
            onChange={(event) => setExpenseCurrency(event.target.value as typeof settings.expenseCurrency)}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Display currency
          <select
            value={settings.displayCurrency}
            onChange={(event) => setDisplayCurrency(event.target.value as typeof settings.displayCurrency)}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="currency-settings-footer">
        <button className="tab" onClick={refreshRates} disabled={ratesLoading}>
          {ratesLoading ? "Refreshing rates..." : "Refresh exchange rates"}
        </button>
        {settings.incomeCurrency !== settings.displayCurrency ||
        settings.expenseCurrency !== settings.displayCurrency ? (
          <span className="currency-conversion-note">
            Amounts are converted from {settings.incomeCurrency} income and {settings.expenseCurrency}{" "}
            expenses into {settings.displayCurrency}.
          </span>
        ) : (
          <span className="currency-conversion-note">All amounts shown in {settings.displayCurrency}.</span>
        )}
      </div>

      {ratesError && <div className="error">{ratesError} Using fallback rates.</div>}
    </section>
  );
}
