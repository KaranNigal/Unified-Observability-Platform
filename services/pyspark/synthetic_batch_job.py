import os
import json
import logging
import socket
import time
import uuid
import random
import datetime
import traceback
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum as _sum, avg as _avg
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, FloatType, TimestampType

TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))
API_KEY = os.getenv("API_KEY", os.getenv("CAPSULE_API_KEY", "uop_live_demo"))

# JSON Formatter
class JsonFormatter(logging.Formatter):
    def __init__(self, trace_id, source_host, tenant_id=TENANT_ID):
        super().__init__()
        self.trace_id = trace_id
        self.source_host = source_host
        self.component = "pyspark"
        self.tenant_id = tenant_id

    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "component": self.component,
            "log_level": record.levelname,
            "message": record.getMessage(),
            "trace_id": self.trace_id,
            "tenant_id": self.tenant_id,
            "source_host": self.source_host
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logger(trace_id, source_host, tenant_id=TENANT_ID):
    logger = logging.getLogger("synthetic_batch_job")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    
    if not logger.handlers:
        ch = logging.StreamHandler()
        ch.setFormatter(JsonFormatter(trace_id, source_host, tenant_id))
        logger.addHandler(ch)
    
    return logger

def generate_data(num_rows):
    categories = ['electronics', 'clothing', 'food', 'services', 'entertainment']
    now = datetime.datetime.now()
    data = []
    for _ in range(num_rows):
        transaction_id = str(uuid.uuid4())
        customer_id = random.randint(1, 1000)
        amount = random.uniform(10, 10000)
        category = random.choice(categories)
        days_ago = random.randint(0, 30)
        timestamp = now - datetime.timedelta(days=days_ago)
        data.append((transaction_id, customer_id, amount, category, timestamp))
    return data

def main():
    trace_id = str(uuid.uuid4())
    source_host = socket.gethostname()
    logger = setup_logger(trace_id, source_host, TENANT_ID)

    # Metrics Setup
    registry = CollectorRegistry()
    labels = {'component': 'pyspark', 'environment': 'development', 'job_name': 'synthetic_batch', 'tenant_id': TENANT_ID}
    
    duration_gauge = Gauge('pyspark_job_duration_seconds', 'Job duration in seconds', labelnames=labels.keys(), registry=registry)
    records_gauge = Gauge('pyspark_job_records_processed_total', 'Number of records processed', labelnames=labels.keys(), registry=registry)
    status_gauge = Gauge('pyspark_job_status', '1 for success, 0 for failure', labelnames=labels.keys(), registry=registry)
    
    start_time = time.time()
    records_processed = 0
    job_success = 0
    pushgateway_url = os.getenv("PUSHGATEWAY_URL", "http://pushgateway:9091")
    
    logger.info(f"Starting PySpark synthetic batch job for tenant {TENANT_ID}")
    spark = None

    try:
        spark = SparkSession.builder.appName("SyntheticBatchJob").getOrCreate()
        num_rows = 10000
        logger.info(f"Generating {num_rows} synthetic rows")
        
        data = generate_data(num_rows)
        schema = StructType([
            StructField("transaction_id", StringType(), False),
            StructField("customer_id", IntegerType(), False),
            StructField("amount", FloatType(), False),
            StructField("category", StringType(), False),
            StructField("timestamp", TimestampType(), False)
        ])
        
        df = spark.createDataFrame(data, schema)
        records_processed = df.count()
        
        logger.info("Performing aggregations")
        category_agg = df.groupBy("category").agg(
            _sum("amount").alias("total_transactions"),
            _avg("amount").alias("avg_amount")
        )
        category_agg.show()
        
        global_sum = df.select(_sum("amount")).collect()[0][0]
        logger.info(f"Global sum of all transactions: {global_sum}")
        
        if random.random() < 0.1:
            raise Exception("Simulated processing failure")
            
        logger.info("Batch job completed successfully")
        job_success = 1
        
    except Exception as e:
        logger.error(f"Batch job failed: {str(e)}", exc_info=True)
        job_success = 0
    finally:
        end_time = time.time()
        duration = end_time - start_time
        
        duration_gauge.labels(**labels).set(duration)
        records_gauge.labels(**labels).set(records_processed)
        status_gauge.labels(**labels).set(job_success)
        
        logger.info(f"Pushing metrics to {pushgateway_url} with tenant_id {TENANT_ID}")
        try:
            push_to_gateway(
                pushgateway_url,
                job='synthetic_batch',
                registry=registry,
                grouping_key={'tenant_id': TENANT_ID}
            )
            logger.info("Metrics pushed successfully")
        except Exception as e:
            logger.error(f"Failed to push metrics to Pushgateway: {str(e)}", exc_info=True)
            
        if spark:
            spark.stop()

if __name__ == "__main__":
    main()
