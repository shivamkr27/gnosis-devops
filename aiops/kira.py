"""
Kira v2 — Gnosis AIOps Assistant
─────────────────────────────────────────────────────────────────────
Powered by: Google Gemini Flash (free tier)
Cluster access: kubernetes Python client (in-cluster + kubeconfig)
Observability: Prometheus HTTP API (direct queries)

Improvements over v1:
  - subprocess/kubectl replaced with kubernetes Python client
  - Auto-scan: detects anomalies every 30s without user input
  - Incident history: all past diagnoses saved in session
  - Per-service Prometheus metrics with charts (Plotly)
  - Structured diagnosis output (root cause / fix / prevention)
  - Works both locally (kubeconfig) and inside K8s pod (in-cluster)
─────────────────────────────────────────────────────────────────────
Run locally:
    pip install -r requirements.txt
    GEMINI_API_KEY=xxx PROMETHEUS_URL=http://localhost:9090 streamlit run kira.py

Run in-cluster (K8s pod):
    Set GEMINI_API_KEY as a K8s secret, PROMETHEUS_URL as env var.
    KIRA will auto-detect in-cluster config.
"""

import os
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Optional

import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
import google.generativeai as genai

# kubernetes client — works both locally and in-cluster
try:
    from kubernetes import client as k8s_client, config as k8s_config
    from kubernetes.client.rest import ApiException
    K8S_AVAILABLE = True
except ImportError:
    K8S_AVAILABLE = False

# ─── Page config ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="Kira — Gnosis AIOps",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Dark terminal theme ──────────────────────────────────────────────
st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap');

  .stApp { background: #0d1117; color: #e6edf3; }
  .stTextArea textarea, .stSelectbox > div { background: #161b22 !important; color: #e6edf3 !important; border: 1px solid #30363d !important; }
  .stButton > button { background: #238636; color: white; border: none; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .stButton > button:hover { background: #2ea043; }

  .kira-header { font-family: 'JetBrains Mono', monospace; color: #79c0ff; font-size: 1.4rem; font-weight: 600; margin-bottom: 0; }
  .kira-sub { font-family: 'Inter', sans-serif; color: #8b949e; font-size: 0.8rem; margin-top: 2px; }

  .pod-card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; margin: 4px 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .pod-ok { border-left: 3px solid #3fb950; }
  .pod-warn { border-left: 3px solid #d29922; }
  .pod-error { border-left: 3px solid #f85149; }

  .diagnosis-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-top: 12px; font-family: 'Inter', sans-serif; }
  .diagnosis-section { margin-bottom: 12px; }
  .diagnosis-label { color: #79c0ff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }

  .alert-critical { background: #2d1117; border: 1px solid #f85149; border-radius: 6px; padding: 8px 12px; margin: 4px 0; font-size: 12px; }
  .alert-warn { background: #1c1810; border: 1px solid #d29922; border-radius: 6px; padding: 8px 12px; margin: 4px 0; font-size: 12px; }

  .metric-badge { display: inline-block; background: #21262d; border: 1px solid #30363d; border-radius: 4px; padding: 2px 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; margin: 2px; }

  .history-item { background: #161b22; border-left: 3px solid #388bfd; padding: 8px 12px; margin: 6px 0; border-radius: 0 6px 6px 0; font-size: 12px; cursor: pointer; }
  .history-ts { color: #8b949e; font-size: 11px; }

  div[data-testid="stSidebar"] { background: #0d1117; border-right: 1px solid #30363d; }
  hr { border-color: #30363d; }
</style>
""", unsafe_allow_html=True)

# ─── Config ──────────────────────────────────────────────────────────
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NAMESPACE = os.getenv("GNOSIS_NAMESPACE", "gnosis")
AUTO_SCAN_INTERVAL = int(os.getenv("AUTO_SCAN_INTERVAL", "30"))  # seconds

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─── Session state init ──────────────────────────────────────────────
if "incident_history" not in st.session_state:
    st.session_state.incident_history = []   # list of {ts, incident, diagnosis}
if "auto_scan_alerts" not in st.session_state:
    st.session_state.auto_scan_alerts = []
if "last_auto_scan" not in st.session_state:
    st.session_state.last_auto_scan = None
if "selected_history" not in st.session_state:
    st.session_state.selected_history = None

# ─── Kubernetes client setup ─────────────────────────────────────────
@st.cache_resource
def get_k8s_clients():
    """
    Auto-detects environment:
    - Inside K8s pod → uses in-cluster service account token
    - Local dev      → uses ~/.kube/config
    """
    if not K8S_AVAILABLE:
        return None, None, None
    try:
        k8s_config.load_incluster_config()
        source = "in-cluster"
    except k8s_config.ConfigException:
        try:
            k8s_config.load_kube_config()
            source = "kubeconfig"
        except Exception:
            return None, None, None

    core = k8s_client.CoreV1Api()
    apps = k8s_client.AppsV1Api()
    return core, apps, source

# ─── Data fetchers ────────────────────────────────────────────────────

def get_pod_health() -> list[dict]:
    """Fetch pod status using kubernetes Python client (no subprocess)."""
    core, _, source = get_k8s_clients()
    if core is None:
        return [{"error": "kubernetes client not available — check kubeconfig or in-cluster config"}]

    try:
        pods = core.list_namespaced_pod(namespace=NAMESPACE)
        summary = []
        for pod in pods.items:
            containers = pod.status.container_statuses or []
            restarts = sum(c.restart_count for c in containers)
            ready = all(c.ready for c in containers) if containers else False

            # Determine pod state detail
            state = "Running"
            reason = ""
            for c in containers:
                if c.state.waiting:
                    state = "Waiting"
                    reason = c.state.waiting.reason or ""
                elif c.state.terminated:
                    state = "Terminated"
                    reason = c.state.terminated.reason or ""

            summary.append({
                "name": pod.metadata.name,
                "phase": pod.status.phase or "Unknown",
                "state": state,
                "reason": reason,
                "ready": ready,
                "restarts": restarts,
                "node": pod.spec.node_name or "unscheduled",
                "age_minutes": int(
                    (datetime.utcnow() - pod.metadata.creation_timestamp.replace(tzinfo=None)).total_seconds() / 60
                ) if pod.metadata.creation_timestamp else 0,
            })
        return summary
    except ApiException as e:
        return [{"error": f"K8s API error: {e.status} {e.reason}"}]
    except Exception as e:
        return [{"error": str(e)}]


def get_deployments() -> list[dict]:
    """Fetch deployment status."""
    _, apps, _ = get_k8s_clients()
    if apps is None:
        return []
    try:
        deps = apps.list_namespaced_deployment(namespace=NAMESPACE)
        result = []
        for d in deps.items:
            desired = d.spec.replicas or 0
            ready = d.status.ready_replicas or 0
            result.append({
                "name": d.metadata.name,
                "desired": desired,
                "ready": ready,
                "available": d.status.available_replicas or 0,
                "healthy": ready == desired,
            })
        return result
    except Exception:
        return []


def prom_query(query: str) -> list[dict]:
    """Execute a PromQL instant query."""
    try:
        resp = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("data", {}).get("result", [])
        return []
    except Exception:
        return []


def prom_range_query(query: str, minutes: int = 30) -> list[dict]:
    """Execute a PromQL range query for charting."""
    end = datetime.utcnow()
    start = end - timedelta(minutes=minutes)
    try:
        resp = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query_range",
            params={
                "query": query,
                "start": start.timestamp(),
                "end": end.timestamp(),
                "step": "60",
            },
            timeout=8,
        )
        if resp.status_code == 200:
            return resp.json().get("data", {}).get("result", [])
        return []
    except Exception:
        return []


def get_all_metrics() -> dict:
    """Fetch all relevant Prometheus metrics for Gnosis."""
    return {
        "cpu_usage": prom_query(
            f'sum by (container) (rate(container_cpu_usage_seconds_total{{namespace="{NAMESPACE}", container!="", container!="POD"}}[5m])) * 100'
        ),
        "memory_mb": prom_query(
            f'sum by (container) (container_memory_usage_bytes{{namespace="{NAMESPACE}", container!="", container!="POD"}}) / 1024 / 1024'
        ),
        "http_rps": prom_query(
            f'sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}"}}[5m]))'
        ),
        "error_rate_pct": prom_query(
            f'sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}", status=~"5.."}}[5m])) / sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}"}}[5m])) * 100'
        ),
        "p95_latency_ms": prom_query(
            f'histogram_quantile(0.95, sum by (le, job) (rate(http_request_duration_seconds_bucket{{namespace="{NAMESPACE}"}}[5m]))) * 1000'
        ),
        "pod_restarts": prom_query(
            f'sum by (pod) (increase(kube_pod_container_status_restarts_total{{namespace="{NAMESPACE}"}}[1h]))'
        ),
        "pg_connections": prom_query(
            f'pg_stat_activity_count{{namespace="{NAMESPACE}", datname="gnosis"}}'
        ),
        "redis_memory_mb": prom_query(
            f'redis_memory_used_bytes{{namespace="{NAMESPACE}"}} / 1024 / 1024'
        ),
    }


def detect_anomalies(pods: list, metrics: dict) -> list[dict]:
    """
    Rule-based anomaly detection — no AI needed for simple checks.
    Returns list of {severity, service, message}.
    """
    alerts = []

    # Pod-level checks
    for pod in pods:
        if isinstance(pod, dict) and "error" not in pod:
            if pod.get("restarts", 0) > 5:
                alerts.append({
                    "severity": "critical",
                    "service": pod["name"],
                    "message": f"CrashLoopBackOff risk — {pod['restarts']} restarts in last hour",
                })
            elif pod.get("restarts", 0) > 2:
                alerts.append({
                    "severity": "warning",
                    "service": pod["name"],
                    "message": f"Elevated restarts — {pod['restarts']} in last hour",
                })
            if not pod.get("ready") and pod.get("phase") == "Running":
                alerts.append({
                    "severity": "critical",
                    "service": pod["name"],
                    "message": f"Pod Running but not Ready — {pod.get('reason', 'unknown reason')}",
                })

    # Metric checks
    for item in metrics.get("error_rate_pct", []):
        val = float(item.get("value", [0, "0"])[1])
        svc = item.get("metric", {}).get("job", "unknown")
        if val > 10:
            alerts.append({"severity": "critical", "service": svc, "message": f"Error rate {val:.1f}% (>10%)"})
        elif val > 2:
            alerts.append({"severity": "warning", "service": svc, "message": f"Error rate {val:.1f}% (>2%)"})

    for item in metrics.get("p95_latency_ms", []):
        val = float(item.get("value", [0, "0"])[1])
        svc = item.get("metric", {}).get("job", "unknown")
        if val > 3000:
            alerts.append({"severity": "critical", "service": svc, "message": f"P95 latency {val:.0f}ms (>3s)"})
        elif val > 1000:
            alerts.append({"severity": "warning", "service": svc, "message": f"P95 latency {val:.0f}ms (>1s)"})

    for item in metrics.get("cpu_usage", []):
        val = float(item.get("value", [0, "0"])[1])
        svc = item.get("metric", {}).get("container", "unknown")
        if val > 85:
            alerts.append({"severity": "warning", "service": svc, "message": f"CPU {val:.1f}% of limit"})

    for item in metrics.get("pg_connections", []):
        val = float(item.get("value", [0, "0"])[1])
        if val > 80:
            alerts.append({"severity": "critical", "service": "postgres", "message": f"DB connections {val:.0f}/100"})

    return alerts


# ─── Gemini diagnosis ─────────────────────────────────────────────────

def diagnose_with_kira(incident: str, pods: list, metrics: dict, alerts: list) -> str:
    """Send rich context to Gemini Flash for structured diagnosis."""
    if not GEMINI_API_KEY:
        return "⚠️ GEMINI_API_KEY not set. Add it to your environment or K8s secret."

    # Summarise metrics into readable form for the LLM
    def fmt_metric(items, key="container", unit=""):
        return [
            f"{r['metric'].get(key, r['metric'].get('pod', r['metric'].get('job', 'unknown')))}: {float(r['value'][1]):.3f}{unit}"
            for r in items if r.get("value")
        ] if items else ["no data"]

    context = f"""You are Kira, an expert SRE and AIOps assistant for Gnosis — a gamified quiz/battle platform on Kubernetes.

REPORTED INCIDENT:
{incident}

ACTIVE ANOMALIES DETECTED (auto-scan):
{json.dumps(alerts, indent=2) if alerts else "None detected"}

POD HEALTH (kubernetes API):
{json.dumps([p for p in pods if "error" not in p], indent=2)}

PROMETHEUS METRICS (last 5 min):
CPU usage %: {fmt_metric(metrics.get('cpu_usage', []))}
Memory (MB): {fmt_metric(metrics.get('memory_mb', []))}
HTTP req/s: {fmt_metric(metrics.get('http_rps', []), key='job')}
Error rate %: {fmt_metric(metrics.get('error_rate_pct', []), key='job')}
P95 latency ms: {fmt_metric(metrics.get('p95_latency_ms', []), key='job')}
Pod restarts (1h): {fmt_metric(metrics.get('pod_restarts', []), key='pod')}
Postgres connections: {fmt_metric(metrics.get('pg_connections', []), key='datname')}
Redis memory MB: {fmt_metric(metrics.get('redis_memory_mb', []), key='instance')}

GNOSIS SERVICE MAP:
- api-gateway :3000 — JWT auth, reverse proxy to all services, Socket.io upgrade
- auth-service :3001 — login/register, JWT issue, calls progress-service on signup
- content-service :3002 — subjects/levels/questions, Gemini AI integration, heavy DB reads
- progress-service :3003 — XP award on answer, level unlock, calls xp-service
- xp-service :3004 — leaderboard (Redis sorted sets), XP ledger, weekly cron reset
- battle-service :3005 — Socket.io 1v1 and group quiz rooms, Redis room state
- notification-service :3006 — online presence (Redis TTL), challenge notifications
- postgres — shared DB for all services (single instance)
- redis — shared cache: leaderboard, battle rooms, presence heartbeats

DEPENDENCY GRAPH (failures cascade like this):
postgres down → ALL services fail (DB connection pool exhausted)
redis down → xp-service, battle-service, notification-service fail
auth-service down → all authenticated routes fail (gateway returns 401)
content-service down → quiz/lesson pages fail
progress-service down → XP not awarded after lessons
xp-service down → leaderboard stale, XP updates queued

Respond ONLY in this exact structure (use the headers exactly):

## 🔍 Root Cause
[1-2 sentences identifying the most likely cause based on evidence]

## 🎯 Affected Services  
[Bullet list of impacted services and how]

## ⚡ Immediate Fix
[Exact kubectl/bash commands numbered step by step]

## 🛡️ Prevention
[2-3 concrete preventive measures with implementation hints]

## 📊 Confidence
[High/Medium/Low with brief reasoning]
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            context,
            generation_config={"temperature": 0.2, "max_output_tokens": 1500},
        )
        return response.text
    except Exception as e:
        return f"❌ Gemini API error: {str(e)}"


# ─── Charts ──────────────────────────────────────────────────────────

def render_metric_chart(title: str, query: str, unit: str = "", color: str = "#388bfd"):
    """Render a small Plotly time-series chart from Prometheus range query."""
    data = prom_range_query(query)
    if not data:
        st.caption(f"_{title}: no data_")
        return

    fig = go.Figure()
    for series in data[:6]:  # max 6 lines
        label = (
            series["metric"].get("job")
            or series["metric"].get("container")
            or series["metric"].get("pod")
            or "unknown"
        )
        times = [datetime.utcfromtimestamp(float(v[0])) for v in series["values"]]
        values = [float(v[1]) for v in series["values"]]
        fig.add_trace(go.Scatter(x=times, y=values, name=label, mode="lines",
                                  line=dict(width=1.5)))

    fig.update_layout(
        title=dict(text=title, font=dict(size=13, color="#e6edf3")),
        paper_bgcolor="#161b22",
        plot_bgcolor="#161b22",
        font=dict(color="#8b949e", size=11),
        height=200,
        margin=dict(l=0, r=0, t=30, b=0),
        legend=dict(font=dict(size=10), bgcolor="rgba(0,0,0,0)"),
        xaxis=dict(gridcolor="#21262d", showgrid=True),
        yaxis=dict(gridcolor="#21262d", showgrid=True, title=unit),
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


# ─── Sidebar ─────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown('<div class="kira-header">🧠 Kira</div>', unsafe_allow_html=True)
    st.markdown('<div class="kira-sub">Gnosis AIOps · Gemini Flash</div>', unsafe_allow_html=True)
    st.divider()

    _, _, k8s_source = get_k8s_clients()
    if k8s_source:
        st.success(f"K8s: {k8s_source}", icon="✅")
    else:
        st.error("K8s: not connected", icon="❌")

    prom_up = False
    try:
        r = requests.get(f"{PROMETHEUS_URL}/-/healthy", timeout=3)
        prom_up = r.status_code == 200
    except Exception:
        pass
    if prom_up:
        st.success("Prometheus: connected", icon="✅")
    else:
        st.warning("Prometheus: not reachable", icon="⚠️")

    if GEMINI_API_KEY:
        st.success("Gemini: configured", icon="✅")
    else:
        st.error("GEMINI_API_KEY: missing", icon="❌")

    st.divider()
    st.caption("**Settings**")
    namespace_override = st.text_input("Namespace", value=NAMESPACE)
    if namespace_override != NAMESPACE:
        NAMESPACE = namespace_override

    auto_scan = st.toggle("Auto-scan (30s)", value=True)
    show_charts = st.toggle("Show metric charts", value=True)

    st.divider()

    # Incident history in sidebar
    if st.session_state.incident_history:
        st.caption(f"**Incident History ({len(st.session_state.incident_history)})**")
        for i, item in enumerate(reversed(st.session_state.incident_history[-10:])):
            if st.button(
                f"🕐 {item['ts']} — {item['incident'][:35]}...",
                key=f"hist_{i}",
                use_container_width=True,
            ):
                st.session_state.selected_history = item
        if st.button("🗑️ Clear history", use_container_width=True):
            st.session_state.incident_history = []
            st.session_state.selected_history = None
            st.rerun()


# ─── Main layout ─────────────────────────────────────────────────────

col_left, col_right = st.columns([1, 1], gap="medium")

# ── LEFT: Cluster status ─────────────────────────────────────────────
with col_left:
    header_cols = st.columns([3, 1])
    with header_cols[0]:
        st.subheader("📡 Cluster Status")
    with header_cols[1]:
        if st.button("⟳ Refresh", use_container_width=True):
            st.cache_data.clear()
            st.rerun()

    # Fetch data
    with st.spinner("Querying cluster..."):
        pods = get_pod_health()
        deployments = get_deployments()
        metrics = get_all_metrics()
        anomalies = detect_anomalies(pods, metrics)

    # Auto-scan alert banner
    if anomalies:
        critical = [a for a in anomalies if a["severity"] == "critical"]
        warnings  = [a for a in anomalies if a["severity"] == "warning"]
        if critical:
            st.error(f"🚨 {len(critical)} critical anomaly detected", icon="🚨")
        if warnings:
            st.warning(f"⚠️ {len(warnings)} warning detected")

        with st.expander(f"Auto-scan alerts ({len(anomalies)})", expanded=bool(critical)):
            for alert in anomalies:
                css_class = "alert-critical" if alert["severity"] == "critical" else "alert-warn"
                icon = "🔴" if alert["severity"] == "critical" else "🟡"
                st.markdown(
                    f'<div class="{css_class}">{icon} <b>{alert["service"]}</b> — {alert["message"]}</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.success("All systems nominal", icon="✅")

    # Pod cards
    st.caption("**Pods**")
    if pods and "error" not in pods[0]:
        for pod in sorted(pods, key=lambda p: (p.get("ready", True), -p.get("restarts", 0))):
            ready = pod.get("ready", False)
            restarts = pod.get("restarts", 0)
            phase = pod.get("phase", "?")
            reason = f" ({pod['reason']})" if pod.get("reason") else ""

            css = "pod-ok" if ready and restarts == 0 else ("pod-warn" if restarts < 5 else "pod-error")
            icon = "✅" if ready else ("⚠️" if restarts < 5 else "❌")
            restart_badge = f' <span class="metric-badge">↻ {restarts}</span>' if restarts > 0 else ""

            st.markdown(
                f'<div class="pod-card {css}">{icon} {pod["name"]}<span style="color:#8b949e"> — {phase}{reason}</span>{restart_badge}</div>',
                unsafe_allow_html=True,
            )
    else:
        err = pods[0].get("error", "unknown") if pods else "no data"
        st.error(f"kubectl error: {err}")
        st.info("Ensure kubeconfig is set or KIRA runs inside the cluster.")

    # Deployments summary
    if deployments:
        st.caption("**Deployments**")
        dep_data = pd.DataFrame(deployments)
        dep_data["status"] = dep_data.apply(
            lambda r: "✅" if r["healthy"] else f"❌ {r['ready']}/{r['desired']}", axis=1
        )
        st.dataframe(
            dep_data[["name", "desired", "ready", "status"]],
            hide_index=True,
            use_container_width=True,
        )

    # Metric charts
    if show_charts:
        st.caption("**Metrics (last 30 min)**")
        render_metric_chart(
            "HTTP Request Rate (req/s)",
            f'sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}"}}[5m]))',
        )
        render_metric_chart(
            "Error Rate (%)",
            f'sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}", status=~"5.."}}[5m])) / sum by (job) (rate(http_requests_total{{namespace="{NAMESPACE}"}}[5m])) * 100',
            unit="%",
        )
        render_metric_chart(
            "P95 Latency (ms)",
            f'histogram_quantile(0.95, sum by (le, job) (rate(http_request_duration_seconds_bucket{{namespace="{NAMESPACE}"}}[5m]))) * 1000',
            unit="ms",
        )


# ── RIGHT: Diagnosis ─────────────────────────────────────────────────
with col_right:
    st.subheader("🔬 Incident Diagnosis")

    # Show selected history item
    if st.session_state.selected_history:
        item = st.session_state.selected_history
        st.info(f"📂 Viewing history: {item['ts']} — {item['incident']}")
        st.markdown(item["diagnosis"], unsafe_allow_html=False)
        if st.button("← Back to new diagnosis"):
            st.session_state.selected_history = None
            st.rerun()
    else:
        # Quick incident selector
        quick = st.selectbox("Quick incidents:", [
            "— describe manually below —",
            "Users getting 401/403 on all routes",
            "Battle rooms not connecting (WebSocket fails)",
            "XP not updating after lesson complete",
            "Leaderboard showing stale/wrong values",
            "Postgres connection pool exhausted",
            "Redis connection refused",
            "Pod in CrashLoopBackOff",
            "Content service Gemini AI timeout",
            "Notification service not delivering alerts",
            "High latency across all services (>2s)",
        ])

        incident_text = st.text_area(
            "Describe the incident:",
            value="" if quick.startswith("—") else quick,
            placeholder="Example: Users report 503 on the battle page since 14:30. "
                        "Socket connections fail immediately after handshake.",
            height=120,
        )

        # Auto-fill if anomalies detected
        if anomalies and not incident_text:
            auto_desc = "Auto-scan detected: " + "; ".join(
                f"{a['service']} — {a['message']}" for a in anomalies[:3]
            )
            if st.button("🤖 Auto-diagnose detected anomalies"):
                incident_text = auto_desc

        diag_btn = st.button(
            "🧠 Diagnose with Kira",
            type="primary",
            disabled=not incident_text or not GEMINI_API_KEY,
            use_container_width=True,
        )

        if diag_btn and incident_text:
            with st.spinner("Kira is analyzing cluster state + metrics..."):
                diagnosis = diagnose_with_kira(incident_text, pods, metrics, anomalies)

            # Save to history
            ts = datetime.now().strftime("%H:%M:%S")
            st.session_state.incident_history.append({
                "ts": ts,
                "incident": incident_text,
                "diagnosis": diagnosis,
            })

            st.markdown('<div class="diagnosis-box">', unsafe_allow_html=True)
            st.markdown(diagnosis)
            st.markdown('</div>', unsafe_allow_html=True)

            # Export
            report = (
                f"KIRA INCIDENT REPORT\n"
                f"{'='*50}\n"
                f"Timestamp : {datetime.now().isoformat()}\n"
                f"Namespace : {NAMESPACE}\n"
                f"Incident  : {incident_text}\n\n"
                f"AUTO-SCAN ALERTS:\n"
                + "\n".join(f"  [{a['severity'].upper()}] {a['service']}: {a['message']}" for a in anomalies)
                + f"\n\nDIAGNOSIS:\n{diagnosis}\n"
            )
            st.download_button(
                "📥 Export report (.txt)",
                data=report,
                file_name=f"kira-{datetime.now().strftime('%Y%m%d-%H%M%S')}.txt",
                mime="text/plain",
            )

    # Auto-scan status
    st.divider()
    if auto_scan:
        last = st.session_state.last_auto_scan
        last_str = last.strftime("%H:%M:%S") if last else "never"
        st.caption(f"🔄 Auto-scan active · last run: {last_str} · interval: {AUTO_SCAN_INTERVAL}s")
        # Update last scan timestamp
        if last is None or (datetime.now() - last).seconds >= AUTO_SCAN_INTERVAL:
            st.session_state.last_auto_scan = datetime.now()
            if anomalies:
                st.session_state.auto_scan_alerts = anomalies
    else:
        st.caption("Auto-scan paused")

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
