import json
import logging
import os
import random
import signal
import socket
import time
import uuid
from datetime import datetime

from confluent_kafka import Producer
from prometheus_client import Counter, Histogram, start_http_server

# Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "trading-events")
MESSAGES_PER_SECOND = float(os.getenv("MESSAGES_PER_SECOND", "100"))
PROMETHEUS_PORT = int(os.getenv("PROMETHEUS_PORT", "8002"))
TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))
API_KEY = os.getenv("API_KEY", os.getenv("CAPSULE_API_KEY", "uop_live_demo"))

# Metrics
MESSAGES_SENT = Counter(
    "kafka_producer_messages_sent_total",
    "Total number of messages sent",
    ["component", "environment", "topic", "symbol", "tenant_id"],
)
SEND_ERRORS = Counter(
    "kafka_producer_send_errors_total",
    "Total number of message send errors",
    ["component", "environment", "tenant_id"],
)
MESSAGE_LATENCY = Histogram(
    "kafka_producer_message_latency_seconds",
    "Latency of sending messages",
    ["component", "environment", "tenant_id"],
)


# Logging Setup
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "component": "kafka-trading",
            "log_level": record.levelname,
            "message": record.getMessage(),
            "source_host": socket.gethostname(),
            "tenant_id": TENANT_ID,
        }
        if hasattr(record, "trace_id"):
            log_record["trace_id"] = record.trace_id
        return json.dumps(log_record)


logger = logging.getLogger("kafka-producer")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

# Symbols and Base Prices
SYMBOLS = {
    "AAPL": 150.0,
    "GOOGL": 2800.0,
    "MSFT": 300.0,
    "AMZN": 3400.0,
    "TSLA": 900.0,
    "META": 330.0,
    "NVDA": 220.0,
    "JPM": 160.0,
    "V": 230.0,
    "WMT": 140.0,
}
EVENT_TYPES = ["BUY", "SELL", "CANCEL"]
TRADERS = [f"TRADER-{i:03d}" for i in range(1, 51)]

shutdown_flag = False


def handle_shutdown(sig, frame):
    global shutdown_flag
    logger.info("Shutdown signal received")
    shutdown_flag = True


signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


def delivery_report(err, msg):
    if err is not None:
        SEND_ERRORS.labels(component="kafka-trading", environment="development").inc()
        logger.error(f"Message delivery failed: {err}")


def generate_event():
    symbol = random.choice(list(SYMBOLS.keys()))
    base_price = SYMBOLS[symbol]
    price = base_price * (1 + random.uniform(-0.05, 0.05))
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "symbol": symbol,
        "event_type": random.choice(EVENT_TYPES),
        "price": round(price, 2),
        "quantity": random.randint(1, 1000),
        "trader_id": random.choice(TRADERS),
        "tenant_id": TENANT_ID,
    }


def connect_kafka_with_retry():
    backoff = 1
    max_backoff = 60
    while not shutdown_flag:
        try:
            producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS})
            logger.info(f"Connected to Kafka at {KAFKA_BOOTSTRAP_SERVERS}")
            return producer
        except Exception as e:
            logger.error(
                f"Failed to connect to Kafka: {e}. Retrying in {backoff} seconds..."
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
    return None


def main():
    logger.info("Starting Prometheus metrics server...")
    start_http_server(PROMETHEUS_PORT)

    producer = connect_kafka_with_retry()
    if not producer:
        return

    logger.info("Starting trading event producer...")

    last_log_time = time.time()
    messages_in_interval = 0
    errors_in_interval = 0

    while not shutdown_flag:
        start_time = time.time()

        event = generate_event()
        try:
            producer.produce(
                KAFKA_TOPIC, value=json.dumps(event), on_delivery=delivery_report
            )
            producer.poll(0)

            MESSAGES_SENT.labels(
                component="kafka-trading",
                environment="development",
                topic=KAFKA_TOPIC,
                symbol=event["symbol"],
                tenant_id=TENANT_ID,
            ).inc()

            latency = time.time() - start_time
            MESSAGE_LATENCY.labels(
                component="kafka-trading",
                environment="development",
                tenant_id=TENANT_ID,
            ).observe(latency)

            messages_in_interval += 1

        except BufferError:
            logger.warning("Local producer queue is full, waiting...")
            producer.poll(0.1)
            errors_in_interval += 1
        except Exception as e:
            logger.error(f"Exception producing message: {e}")
            SEND_ERRORS.labels(
                component="kafka-trading",
                environment="development",
                tenant_id=TENANT_ID,
            ).inc()
            errors_in_interval += 1

        current_time = time.time()
        if current_time - last_log_time >= 10:
            logger.info(
                f"Produced {messages_in_interval} messages, {errors_in_interval} errors in the last 10 seconds."
            )
            messages_in_interval = 0
            errors_in_interval = 0
            last_log_time = current_time

        sleep_time = max(0, (1.0 / MESSAGES_PER_SECOND) - (time.time() - start_time))
        if sleep_time > 0:
            time.sleep(sleep_time)

    logger.info("Flushing producer...")
    producer.flush()
    logger.info("Producer shut down successfully.")


if __name__ == "__main__":
    main()
