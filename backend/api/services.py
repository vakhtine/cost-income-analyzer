from __future__ import annotations

import io
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data_parser import classify_rows, parse_uploaded_file
from lib.ai_advisor import build_period_advice, detect_categorization_issues
from lib.analyzer import analyze_transactions
from lib.city_benchmarks import compare_to_reference, list_cities
from lib.health_score import calculate_health_score
from lib.period_analyzer import compare_periods

from api.serializers import (
    analysis_to_dict,
    comparison_to_dict,
    dataframe_to_records,
    health_to_dict,
    to_jsonable,
)


class AnalysisService:
    def classify_periods(self, periods: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
        return {name: classify_rows(df) for name, df in periods.items()}

    def parse_file(self, filename: str, content: bytes) -> dict[str, pd.DataFrame]:
        upload = io.BytesIO(content)
        upload.name = filename
        parsed = parse_uploaded_file(upload)
        return self.classify_periods(parsed)

    def build_response(self, periods: dict[str, pd.DataFrame]) -> dict:
        period_names = list(periods.keys())
        period_analysis = {
            name: analysis_to_dict(analyze_transactions(df)) for name, df in periods.items()
        }
        period_rows = {name: dataframe_to_records(df) for name, df in periods.items()}

        comparison = None
        if len(period_names) >= 2:
            comparison = comparison_to_dict(
                compare_periods(
                    periods[period_names[-2]],
                    periods[period_names[-1]],
                    period_names[-2],
                    period_names[-1],
                )
            )

        health = health_to_dict(calculate_health_score(periods))
        flags = to_jsonable(detect_categorization_issues(periods))
        advice = build_period_advice(
            periods,
            compare_periods(
                periods[period_names[-2]],
                periods[period_names[-1]],
                period_names[-2],
                period_names[-1],
            )
            if len(period_names) >= 2
            else None,
        )

        return {
            "periods": period_names,
            "period_analysis": period_analysis,
            "period_rows": period_rows,
            "comparison": comparison,
            "health_score": health,
            "categorization_flags": flags,
            "advisor_notes": advice,
            "privacy_notice": "Your file was processed in memory only and was not stored.",
        }

    def records_to_periods(self, period_rows: dict[str, list[dict]]) -> dict[str, pd.DataFrame]:
        periods: dict[str, pd.DataFrame] = {}
        for name, rows in period_rows.items():
            frame = pd.DataFrame(rows)
            if "date" in frame.columns:
                frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
            periods[name] = classify_rows(frame)
        return periods

    def compare_location(
        self,
        periods: dict[str, pd.DataFrame],
        reference_city: str,
        household_size: int,
        period_name: str | None,
    ) -> dict:
        if period_name and period_name != "All periods":
            analysis_df = periods[period_name]
            label = period_name
        else:
            combined = pd.concat(periods.values(), ignore_index=True)
            analysis_df = combined.groupby(
                ["merchant_name", "category", "transaction_type"], as_index=False
            ).agg(amount=("amount", "sum"), abs_amount=("abs_amount", "sum"))
            analysis_df["date"] = pd.NaT
            analysis_df["period"] = "All periods"
            label = "all uploaded periods"

        comparisons = compare_to_reference(analysis_df, reference_city, household_size)
        return {
            "period_label": label,
            "reference_city": reference_city,
            "household_size": household_size,
            "comparisons": to_jsonable(comparisons),
            "data_notice": "Reference costs are illustrative benchmarks until Phase 1 live data is connected.",
        }

    def list_cities(self) -> list[str]:
        return list_cities()
