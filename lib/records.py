from __future__ import annotations

import pandas as pd

from data_parser import classify_rows


DISPLAY_COLUMNS = ["merchant_name", "category", "amount", "date"]


def period_to_editor_df(df: pd.DataFrame) -> pd.DataFrame:
    columns = [column for column in DISPLAY_COLUMNS if column in df.columns]
    editor_df = df[columns].copy()
    if "date" in editor_df.columns:
        editor_df["date"] = editor_df["date"].apply(
            lambda value: value.date().isoformat() if pd.notna(value) else ""
        )
    return editor_df


def editor_to_classified_df(editor_df: pd.DataFrame, period_name: str) -> pd.DataFrame:
    cleaned = editor_df.copy()
    cleaned = cleaned.rename(
        columns={
            "merchant_name": "merchant_name",
            "category": "category",
            "amount": "amount",
            "date": "date",
        }
    )
    cleaned["merchant_name"] = cleaned["merchant_name"].astype(str).str.strip()
    cleaned["category"] = cleaned["category"].astype(str).str.strip()
    cleaned["amount"] = pd.to_numeric(cleaned["amount"], errors="coerce")
    cleaned = cleaned.dropna(subset=["merchant_name", "category", "amount"])
    cleaned = cleaned[(cleaned["merchant_name"] != "") & (cleaned["category"] != "")]
    cleaned = cleaned[cleaned["amount"] != 0]

    if "date" in cleaned.columns:
        cleaned["date"] = pd.to_datetime(cleaned["date"], errors="coerce")
    else:
        cleaned["date"] = pd.NaT

    cleaned["period"] = period_name
    return classify_rows(cleaned.reset_index(drop=True))


def apply_flag_decisions(
    periods: dict[str, pd.DataFrame],
    decisions: dict[tuple[str, int], str],
) -> dict[str, pd.DataFrame]:
    updated: dict[str, pd.DataFrame] = {}
    for period_name, df in periods.items():
        frame = df.copy()
        for (decision_period, row_id), new_category in decisions.items():
            if decision_period == period_name and row_id in frame.index:
                frame.loc[row_id, "category"] = new_category
        columns = [column for column in ["merchant_name", "category", "amount", "date", "period"] if column in frame.columns]
        updated[period_name] = classify_rows(frame[columns].copy())
    return updated
