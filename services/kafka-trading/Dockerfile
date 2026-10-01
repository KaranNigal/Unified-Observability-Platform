FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Default: run producer. Override CMD for consumer.
CMD ["python", "producer.py"]
