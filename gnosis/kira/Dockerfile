FROM python:3.11-slim
WORKDIR /app
COPY kira/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY kira/kira.py ./kira.py
EXPOSE 8501
CMD ["streamlit", "run", "kira.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
