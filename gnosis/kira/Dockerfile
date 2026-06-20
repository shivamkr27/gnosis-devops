FROM python:3.13-slim
WORKDIR /app
RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get clean && find /var/lib/apt -type f -delete
RUN adduser --disabled-password --gecos '' appuser
COPY kira/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY kira/kira.py ./kira.py
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8501
CMD ["streamlit", "run", "kira.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
