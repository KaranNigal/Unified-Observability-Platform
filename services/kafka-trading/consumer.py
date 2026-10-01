import os
import json
import time
import random
import signal
import socket
import logging
from datetime import datetime
from confluent_kafka import Consumer, KafkaError, TopicPartition
from prometheus_client import start_http_server, Counter, Gauge, Histogram

# Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'trading-events')
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'trading-consumer-group')
PROMETHEUS_PORT = int(os.getenv('PROMETHEUS_PORT', '8003'))
TENANT_ID = os.getenv('TENANT_ID', os.getenv('CAPSULE_TENANT_ID', 'demo'))
API_KEY = os.getenv('API_KEY', os.getenv('CAPSULE_API_KEY', 'uop_live_demo'))

# Metrics
MESSAGES_CONSUMED = Counter(
    'kafka_consumer_messages_consumed_total',
    'Total number of messages consumed',
    ['component', 'environment', 'topic', 'tenant_id']
)
CONSUMER_LAG = Gauge(
    'kafka_consumer_lag_messages',
    'Consumer lag per partition',
    ['component', 'environment', 'topic', 'partition', 'tenant_id']
)
PROCESSING_DURATION = Histogram(
    'kafka_consumer_processing_duration_seconds',
    'Latency of processing messages',
    ['component', 'environment', 'tenant_id']
)

# Logging Setup
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + 'Z',
            "component": "kafka-trading",
            "log_level": record.levelname,
            "message": record.getMessage(),
            "source_host": socket.gethostname(),
            "tenant_id": TENANT_ID
        }
        if hasattr(record, 'trace_id'):
            log_record['trace_id'] = record.trace_id
        return json.dumps(log_record)

logger = logging.getLogger('kafka-consumer')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

shutdown_flag = False

def handle_shutdown(sig, frame):
    global shutdown_flag
    logger.info("Shutdown signal received")
    shutdown_flag = True

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

def connect_kafka_with_retry():
    backoff = 1
    max_backoff = 60
    while not shutdown_flag:
        try:
            consumer = Consumer({
                'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS,
                'group.id': KAFKA_GROUP_ID,
                'auto.offset.reset': 'earliest'
            })
            logger.info(f"Connected to Kafka at {KAFKA_BOOTSTRAP_SERVERS}")
            return consumer
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}. Retrying in {backoff} seconds...")
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
    return None

def update_lag(consumer):
    try:
        assignments = consumer.assignment()
        total_lag = 0
        for p in assignments:
            low, high = consumer.get_watermark_offsets(p, timeout=1.0)
            if high is not None and p.offset is not None and p.offset >= 0:
                lag = high - p.offset
                CONSUMER_LAG.labels(
                    component='kafka-trading',
                    environment='development',
                    topic=p.topic,
                    partition=str(p.partition),
                    tenant_id=TENANT_ID
                ).set(lag)
                total_lag += lag
        return total_lag
    except Exception as e:
        logger.error(f"Error calculating lag: {e}")
        return 0

def main():
    logger.info("Starting Prometheus metrics server...")
    start_http_server(PROMETHEUS_PORT)
    
    consumer = connect_kafka_with_retry()
    if not consumer:
        return

    logger.info(f"Subscribing to topic {KAFKA_TOPIC}...")
    consumer.subscribe([KAFKA_TOPIC])
    
    last_log_time = time.time()
    messages_in_interval = 0
    
    while not shutdown_flag:
        msg = consumer.poll(1.0)
        
        if msg is None:
            # Periodically report lag even if no messages
            current_time = time.time()
            if current_time - last_log_time >= 10:
                lag = update_lag(consumer)
                logger.info(f"Consumed {messages_in_interval} messages in the last 10 seconds. Current total lag: {lag}.")
                messages_in_interval = 0
                last_log_time = current_time
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            logger.error(f"Consumer error: {msg.error()}")
            continue
            
        start_time = time.time()
        
        try:
            event = json.loads(msg.value().decode('utf-8'))
            time.sleep(random.uniform(0.001, 0.01))
            
            MESSAGES_CONSUMED.labels(
                component='kafka-trading', 
                environment='development',
                topic=KAFKA_TOPIC,
                tenant_id=TENANT_ID
            ).inc()
            
            processing_time = time.time() - start_time
            PROCESSING_DURATION.labels(component='kafka-trading', environment='development', tenant_id=TENANT_ID).observe(processing_time)
            
            messages_in_interval += 1
        except Exception as e:
            logger.error(f"Error processing message: {e}")

        current_time = time.time()
        if current_time - last_log_time >= 10:
            lag = update_lag(consumer)
            logger.info(f"Consumed {messages_in_interval} messages in the last 10 seconds. Current total lag: {lag}.")
            messages_in_interval = 0
            last_log_time = current_time

    logger.info("Closing consumer...")
    consumer.close()
    logger.info("Consumer shut down successfully.")

if __name__ == "__main__":
    main()
