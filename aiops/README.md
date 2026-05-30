# Kira — Gnosis AIOps Assistant

Kira is an AI-powered incident diagnosis tool for the Gnosis platform. It analyzes live Kubernetes pod health and Prometheus metrics, then uses Google Gemini Flash to provide root cause analysis and remediation steps.

## Setup

```bash
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
export PROMETHEUS_URL=http://your-prometheus:9090
streamlit run kira.py
```

## Features
- Live pod health from kubectl
- Prometheus metrics (CPU, memory, error rate, restarts)
- Gemini Flash AI diagnosis — free tier
- Export incident reports
- Quick-select common Gnosis issues
