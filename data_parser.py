from __future__ import annotations

import re
from io import BytesIO, StringIO
from typing import BinaryIO

import pandas as pd

COLUMN_ALIASES = {
    "merchant": "merchant_name",
    "merchant name": "merchant_name",
    "category": "category",
    "amount": "amount",
    "total amount": "amount",
    "total": "amount",
    "transaction amount": "amount",
    "value": "amount",
    "date": "date",
    "period": "period",
}

INCOME_CATEGORIES = {
    "salary",
    "pension",
    "investment income",
    "investment",
    "dividends",
    "interest",
    "other income",
    "income",
    "rental income",
    "bonus",
}

TRANSFER_CATEGORIES = {
    "transfer",
    "transfers",
    "credit card payment",
    "cc payment",
    "internal transfer",
    "account transfer",
}


def _resolve_transaction_type(category: str) -> str:
    normalized = category.strip().lower()
    if normalized in INCOME_CATEGORIES:
        return "income"
    if normalized in TRANSFER_CATEGORIES:
        return "transfer"
    return "expense"


def _normalize_header(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).strip().lower())


def _map_columns(raw: pd.DataFrame) -> pd.DataFrame:
    column_map: dict[str, str] = {}
    for column in raw.columns:
        normalized = _normalize_header(column)
        if normalized in COLUMN_ALIASES:
            column_map[column] = COLUMN_ALIASES[normalized]

    has_merchant = "merchant_name" in column_map.values()
    has_category = "category" in column_map.values()
    has_amount = "amount" in column_map.values()

    if not (has_merchant and has_category and has_amount):
        raise ValueError(
            "Each period must include Merchant, Category, and Amount columns. "
            "Date and Period are optional."
        )

    df = raw.rename(columns=column_map).copy()
    return _validate_and_clean(df)


def _validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        raise ValueError("A period cannot be empty.")

    df["merchant_name"] = df["merchant_name"].astype(str).str.strip()
    df["category"] = df["category"].astype(str).str.strip()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    else:
        df["date"] = pd.NaT

    if "period" in df.columns:
        df["period"] = df["period"].astype(str).str.strip()
    else:
        df["period"] = ""

    if df["merchant_name"].eq("").any() or df["category"].eq("").any():
        raise ValueError("Merchant and Category cannot be blank.")

    if df["amount"].isna().any():
        raise ValueError("Amount must be a valid number on every row.")

    if (df["amount"] == 0).any():
        raise ValueError("Amount cannot be zero.")

    return df.reset_index(drop=True)


def parse_sheet_dataframe(raw: pd.DataFrame, period_name: str) -> pd.DataFrame:
    df = _map_columns(raw)
    if df["period"].eq("").all():
        df["period"] = period_name
    return df


def parse_csv_text(csv_text: str, period_name: str = "Period 1") -> pd.DataFrame:
    raw = pd.read_csv(StringIO(csv_text))
    return parse_sheet_dataframe(raw, period_name)


def parse_uploaded_file(uploaded_file) -> dict[str, pd.DataFrame]:
    filename = uploaded_file.name.lower()
    if filename.endswith(".xlsx"):
        return _parse_excel(uploaded_file)
    if filename.endswith(".csv"):
        csv_text = uploaded_file.getvalue().decode("utf-8-sig")
        raw = pd.read_csv(StringIO(csv_text))
        return _split_csv_periods(raw)
    raise ValueError("Upload a .csv or .xlsx file.")


def _parse_excel(uploaded_file: BinaryIO) -> dict[str, pd.DataFrame]:
    workbook = pd.read_excel(BytesIO(uploaded_file.getvalue()), sheet_name=None)
    if not workbook:
        raise ValueError("The Excel file has no sheets.")

    periods: dict[str, pd.DataFrame] = {}
    for sheet_name, sheet_df in workbook.items():
        clean_name = str(sheet_name).strip() or "Period"
        periods[clean_name] = parse_sheet_dataframe(sheet_df, clean_name)
    return periods


def _split_csv_periods(raw: pd.DataFrame) -> dict[str, pd.DataFrame]:
    normalized_columns = {_normalize_header(column): column for column in raw.columns}
    if "period" in normalized_columns:
        period_col = normalized_columns["period"]
        periods: dict[str, pd.DataFrame] = {}
        for period_name, group in raw.groupby(period_col, sort=False):
            clean_name = str(period_name).strip() or "Period"
            periods[clean_name] = parse_sheet_dataframe(group.drop(columns=[period_col]), clean_name)
        return periods

    if "date" in {_normalize_header(column) for column in raw.columns}:
        mapped = _map_columns(raw)
        dated = mapped.dropna(subset=["date"])
        if not dated.empty:
            month_keys = dated["date"].dt.to_period("M")
            if month_keys.nunique() > 1:
                periods = {}
                for month, group in dated.groupby(month_keys, sort=True):
                    clean_name = str(month)
                    periods[clean_name] = group.copy()
                    periods[clean_name]["period"] = clean_name
                undated = mapped[mapped["date"].isna()].copy()
                if not undated.empty:
                    periods["Undated"] = undated
                    periods["Undated"]["period"] = "Undated"
                return periods

    return {"Period 1": parse_sheet_dataframe(raw, "Period 1")}


def classify_rows(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    normalized_categories = result["category"].str.strip().str.lower()
    result["transaction_type"] = normalized_categories.map(_resolve_transaction_type)
    result["abs_amount"] = result["amount"].abs()
    return result
