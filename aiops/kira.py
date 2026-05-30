"""
Kira — Gnosis AIOps Assistant
Powered by Google Gemini Flash (Free Tier)
Analyzes Kubernetes pod health + Prometheus metrics to diagnose incidents
"""

import streamlit as st
import requests
import subprocess
import json
import os
from datetime import datetime
import google.generativeai as genai

# ─── Config ──────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Kira — Gnosis AIOps",
    page_icon="🧠",
    layout="wide"
)

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NAMESPACE = "gnosis"

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─── Data Fetchers ────────────────────────────────────────────────────
def get_pod_health():
    """Fetch pod status from kubectl"""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pods", "-n", NAMESPACE, "-o", "json"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return {"error": result.stderr}

        pods = json.loads(result.stdout).get("items", [])
        summary = []
        for pod in pods:
            name = pod["metadata"]["name"]
            phase = pod["status"].get("phase", "Unknown")
            containers = pod["status"].get("containerStatuses", [])
            restarts = sum(c.get("restartCount", 0) for c in containers)
            ready = all(c.get("ready", False) for c in containers)
            summary.append({
                "name": name,
                "phase": phase,
                "ready": ready,
                "restarts": restarts
            })
        return summary
    except Exception as e:
        return {"error": str(e)}


def get_prometheus_metrics():
    """Fetch key metrics from Prometheus"""
    metrics = {}
    queries = {
        "cpu_usage": 'sum by (container) (rate(container_cpu_usage_seconds_total{namespace="gnosis"}[5m]))',
        "memory_usage": 'sum by (container) (container_memory_usage_bytes{namespace="gnosis"})',
        "http_requests": 'sum by (container) (rate(http_requests_total{namespace="gnosis"}[5m]))',
        "error_rate": 'sum by (container) (rate(http_requests_total{namespace="gnosis", status=~"5.."}[5m]))',
        "pod_restarts": 'sum by (pod) (kube_pod_container_status_restarts_total{namespace="gnosis"})',
    }

    for metric_name, query in queries.items():
        try:
            resp = requests.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": query},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {}).get("result", [])
                metrics[metric_name] = [
                    {"label": r["metric"], "value": r["value"][1]}
                    for r in data
                ]
            else:
                metrics[metric_name] = []
        except Exception:
            metrics[metric_name] = []

    return metrics


def diagnose_with_kira(incident_description, pod_health, metrics):
    """Send context to Gemini Flash for diagnosis"""
    if not GEMINI_API_KEY:
        return "⚠️ GEMINI_API_KEY not set. Please add it to your environment."

    context = f"""
You are Kira, an expert AIOps assistant for Gnosis — a gamified learning platform running on Kubernetes.

INCIDENT REPORTED:
{incident_description}

POD HEALTH (kubectl get pods -n gnosis):
{json.dumps(pod_health, indent=2)}

PROMETHEUS METRICS (last 5 minutes):
{json.dumps(metrics, indent=2)}

GNOSIS ARCHITECTURE:
- api-gateway (port 3000) — single entry point, JWT auth, proxies to services
- auth-service (3001) — login, register, JWT
- content-service (3002) — subjects, levels, questions, Gemini AI
- progress-service (3003) — XP award, level unlock
- xp-service (3004) — leaderboard, XP ledger
- battle-service (3005) — Socket.io 1v1 and group quiz
- notification-service (3006) — online presence, alerts
- postgres — primary database
- redis — leaderboard sorted sets, room state, presence TTL

Analyze the incident and provide:
1. ROOT CAUSE — what is most likely causing this issue
2. AFFECTED SERVICES — which Gnosis services are impacted
3. IMMEDIATE FIX — exact commands or steps to resolve now
4. PREVENTION — how to prevent this in future

Be specific, actionable, and concise.
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(context)
        return response.text
    except Exception as e:
        return f"Gemini API error: {str(e)}"


# ─── UI ───────────────────────────────────────────────────────────────
st.title("🧠 Kira — Gnosis AIOps Assistant")
st.caption(f"Powered by Google Gemini Flash · Namespace: {NAMESPACE} · {datetime.now().strftime('%H:%M:%S')}")

col1, col2 = st.columns([1, 1])

with col1:
    st.subheader("📊 Live Cluster Status")

    if st.button("🔄 Refresh", key="refresh"):
        st.rerun()

    with st.spinner("Fetching pod health..."):
        pods = get_pod_health()

    if isinstance(pods, list):
        for pod in pods:
            status_emoji = "✅" if pod["ready"] else "❌"
            restart_warn = " ⚠️" if pod["restarts"] > 3 else ""
            st.markdown(
                f"{status_emoji} **{pod['name']}** — {pod['phase']} "
                f"| Restarts: `{pod['restarts']}`{restart_warn}"
            )
    else:
        st.error(f"kubectl error: {pods.get('error', 'Unknown')}")
        st.info("Make sure kubectl is configured and cluster is reachable")

    st.divider()
    st.subheader("📈 Prometheus Metrics")

    with st.spinner("Fetching metrics..."):
        metrics = get_prometheus_metrics()

    if any(metrics.values()):
        for metric_name, values in metrics.items():
            if values:
                st.markdown(f"**{metric_name.replace('_', ' ').title()}**")
                for v in values[:5]:
                    label = v["label"].get("container", v["label"].get("pod", "unknown"))
                    st.markdown(f"  - `{label}`: {float(v['value']):.4f}")
    else:
        st.info("Prometheus not reachable or no metrics yet")


with col2:
    st.subheader("🔍 Incident Analysis")

    incident = st.text_area(
        "Describe the incident:",
        placeholder="Example: Users are getting 503 errors on the battle page. "
                    "Challenge notifications are not being delivered. "
                    "Leaderboard shows wrong XP values.",
        height=150
    )

    st.markdown("**Quick incidents:**")
    quick = st.selectbox("Or pick a common issue:", [
        "— select —",
        "Users can't login, getting 401 errors",
        "Battle service not receiving socket connections",
        "Leaderboard showing stale/wrong XP",
        "Postgres connection pool exhausted",
        "Redis connection refused",
        "Pod is CrashLoopBackOff",
        "XP not updating after lesson complete",
    ])

    if quick != "— select —" and not incident:
        incident = quick

    if st.button("🧠 Diagnose with Kira", type="primary", disabled=not incident):
        with st.spinner("Kira is analyzing..."):
            pod_data = get_pod_health() if not isinstance(pods, dict) else pods
            metric_data = get_prometheus_metrics()
            diagnosis = diagnose_with_kira(incident, pod_data, metric_data)

        st.markdown("### 🔬 Kira's Diagnosis")
        st.markdown(diagnosis)

        st.download_button(
            "📥 Export Report",
            data=f"INCIDENT: {incident}\n\nDIAGNOSIS:\n{diagnosis}\n\nTimestamp: {datetime.now()}",
            file_name=f"kira-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
        )

# ─── Footer ───────────────────────────────────────────────────────────
st.divider()
st.caption("Kira | Gnosis DevOps Suite | Built with Streamlit + Gemini Flash")
