from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

import pandas as pd

from lib.analyzer import AnalysisResult
from lib.health_score import HealthScore
from lib.period_analyzer import PeriodComparison


def to_jsonable(value: Any) -> Any:
    if is_dataclass(value):
        return {key: to_jsonable(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: to_jsonable(item) for key, item in value.items()}
    if isinstance(value, float):
        return round(value, 2)
    return value


def analysis_to_dict(result: AnalysisResult) -> dict:
    return to_jsonable(result)


def health_to_dict(result: HealthScore) -> dict:
    return to_jsonable(result)


def comparison_to_dict(result: PeriodComparison) -> dict:
    return to_jsonable(result)


def dataframe_to_records(df: pd.DataFrame) -> list[dict]:
    display = df.copy()
    if "date" in display.columns:
        display["date"] = display["date"].apply(
            lambda value: value.isoformat() if pd.notna(value) else None
        )
    return display.to_dict(orient="records")
