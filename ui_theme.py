from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

INCOME_COLORS = ["#0F766E", "#14B8A6", "#5EEAD4", "#99F6E4", "#2DD4BF"]
EXPENSE_COLORS = ["#F59E0B", "#F97316", "#EF4444", "#EC4899", "#8B5CF6", "#6366F1"]
CHART_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, Segoe UI, sans-serif", color="#334155", size=13),
    margin=dict(l=20, r=20, t=40, b=20),
)


def inject_styles() -> None:
    st.markdown(
        """
<style>
    .block-container { padding-top: 1.5rem; padding-bottom: 2rem; max-width: 1200px; }
    .hero {
        background: linear-gradient(135deg, #0F766E 0%, #134E4A 55%, #1E3A5F 100%);
        color: white;
        padding: 1.6rem 1.8rem;
        border-radius: 16px;
        margin-bottom: 1rem;
        box-shadow: 0 10px 30px rgba(15, 118, 110, 0.18);
    }
    .hero h1 { color: white !important; font-size: 2rem !important; margin-bottom: 0.2rem; }
    .hero p { color: #D1FAE5 !important; margin-bottom: 0; font-size: 1rem; }
    .privacy-pill {
        display: inline-block;
        background: rgba(255,255,255,0.14);
        border: 1px solid rgba(255,255,255,0.25);
        color: #ECFDF5;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        font-size: 0.85rem;
        margin-top: 0.8rem;
    }
    .metric-card {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 1rem 1.1rem;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
        min-height: 108px;
    }
    .metric-label { color: #64748B; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .metric-value { color: #0F172A; font-size: 1.55rem; font-weight: 700; margin-top: 0.2rem; }
    .metric-income { border-top: 4px solid #10B981; }
    .metric-expense { border-top: 4px solid #F59E0B; }
    .metric-savings { border-top: 4px solid #0F766E; }
    .metric-rate { border-top: 4px solid #6366F1; }
    .section-card {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 1rem 1.2rem;
        margin-bottom: 1rem;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .insight-item {
        background: #F8FAFC;
        border-left: 4px solid #0F766E;
        padding: 0.75rem 0.9rem;
        border-radius: 8px;
        margin-bottom: 0.55rem;
        color: #334155;
    }
    div[data-testid="stTabs"] button[data-baseweb="tab"] {
        font-weight: 600;
    }
    div[data-testid="stFileUploader"] section {
        border: 2px dashed #94A3B8;
        border-radius: 14px;
        background: #FFFFFF;
    }
</style>
        """,
        unsafe_allow_html=True,
    )


def render_hero() -> None:
    st.markdown(
        """
<div class="hero">
  <h1>Cost & Income Analyzer</h1>
  <p>Understand your spending, track savings, and compare periods — privately in your browser.</p>
  <div class="privacy-pill">🔒 Nothing is stored. Your data stays in this session only.</div>
</div>
        """,
        unsafe_allow_html=True,
    )


def render_metric_card(label: str, value: str, css_class: str) -> None:
    st.markdown(
        f"""
<div class="metric-card {css_class}">
  <div class="metric-label">{label}</div>
  <div class="metric-value">{value}</div>
</div>
        """,
        unsafe_allow_html=True,
    )


def render_section_title(title: str, subtitle: str = "") -> None:
    st.markdown(f"### {title}")
    if subtitle:
        st.caption(subtitle)


def render_insight_list(items: list[str]) -> None:
    for item in items:
        st.markdown(f'<div class="insight-item">{item}</div>', unsafe_allow_html=True)


def style_figure(fig: go.Figure) -> go.Figure:
    fig.update_layout(**CHART_LAYOUT)
    return fig


def income_pie_chart(df: pd.DataFrame) -> go.Figure:
    fig = px.pie(
        df,
        names="Category",
        values="Amount",
        hole=0.55,
        color_discrete_sequence=INCOME_COLORS,
    )
    fig.update_traces(textposition="inside", textinfo="percent+label")
    fig.update_layout(showlegend=False, title="Income mix")
    return style_figure(fig)


def expense_bar_chart(df: pd.DataFrame) -> go.Figure:
    df = df.sort_values("Amount", ascending=True)
    fig = px.bar(
        df,
        x="Amount",
        y="Category",
        orientation="h",
        color="Amount",
        color_continuous_scale=["#FDE68A", "#F59E0B", "#EA580C"],
    )
    fig.update_layout(
        showlegend=False,
        coloraxis_showscale=False,
        title="Expense breakdown",
        yaxis_title="",
        xaxis_title="Amount",
    )
    return style_figure(fig)


def period_comparison_chart(df: pd.DataFrame) -> go.Figure:
    fig = px.bar(
        df,
        x="Period",
        y="Amount",
        color="Metric",
        barmode="group",
        color_discrete_map={
            "Income": "#10B981",
            "Expenses": "#F59E0B",
            "Net Savings": "#0F766E",
        },
    )
    fig.update_layout(title="Period comparison", xaxis_title="", yaxis_title="Amount")
    return style_figure(fig)


def health_score_gauge(score: int, summary: str) -> go.Figure:
    color = "#10B981" if score >= 75 else "#F59E0B" if score >= 50 else "#EF4444"
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=score,
            number={"suffix": "/100", "font": {"size": 36}},
            title={"text": summary, "font": {"size": 16}},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": color},
                "bgcolor": "white",
                "steps": [
                    {"range": [0, 50], "color": "#FEE2E2"},
                    {"range": [50, 75], "color": "#FEF3C7"},
                    {"range": [75, 100], "color": "#D1FAE5"},
                ],
            },
        )
    )
    return style_figure(fig)
