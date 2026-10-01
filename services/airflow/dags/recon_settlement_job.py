import os
import json
import logging
import random
import time
import uuid
import socket
from datetime import datetime, timezone, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.exceptions import AirflowException

TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))

def get_structured_log(message, log_level="INFO", trace_id=None, dag_id=None, task_id=None, extra_fields=None):
    if trace_id is None:
        trace_id = str(uuid.uuid4())
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "component": "airflow",
        "environment": "development",
        "log_level": log_level,
        "message": message,
        "trace_id": trace_id,
        "tenant_id": TENANT_ID,
        "source_host": socket.gethostname(),
    }
    if dag_id:
        log_data["dag_id"] = dag_id
    if task_id:
        log_data["task_id"] = task_id
    if extra_fields:
        log_data.update(extra_fields)
    return json.dumps(log_data)

logger = logging.getLogger(__name__)

def check_source_availability(**context):
    dag_id = context['dag'].dag_id
    task_id = context['task'].task_id
    logger.info(get_structured_log("Checking source availability", dag_id=dag_id, task_id=task_id))
    if random.random() < 0.10:
        msg = "Source is unavailable"
        logger.error(get_structured_log(msg, log_level="ERROR", dag_id=dag_id, task_id=task_id, extra_fields={"severity": "critical"}))
        raise AirflowException(msg)
    logger.info(get_structured_log("Source is available", dag_id=dag_id, task_id=task_id))

def fetch_and_process(**context):
    dag_id = context['dag'].dag_id
    task_id = context['task'].task_id
    logger.info(get_structured_log("Fetching and processing data", dag_id=dag_id, task_id=task_id))
    if random.random() < 0.15:
        msg = "Failed to fetch or process data"
        logger.error(get_structured_log(msg, log_level="ERROR", dag_id=dag_id, task_id=task_id, extra_fields={"severity": "critical"}))
        raise AirflowException(msg)
    logger.info(get_structured_log("Fetch and process completed", dag_id=dag_id, task_id=task_id))

def write_results(**context):
    dag_id = context['dag'].dag_id
    task_id = context['task'].task_id
    logger.info(get_structured_log("Writing results", dag_id=dag_id, task_id=task_id))
    if random.random() < 0.05:
        msg = "Failed to write results"
        logger.error(get_structured_log(msg, log_level="ERROR", dag_id=dag_id, task_id=task_id, extra_fields={"severity": "critical"}))
        raise AirflowException(msg)
    logger.info(get_structured_log("Write results completed", dag_id=dag_id, task_id=task_id))

def send_notification(**context):
    dag_id = context['dag'].dag_id
    task_id = context['task'].task_id
    logger.info(get_structured_log("Pipeline completed successfully, sending notification", dag_id=dag_id, task_id=task_id))

with DAG(
    dag_id='recon_settlement_job',
    schedule='0 6 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['demo', 'settlement', 'critical'],
    default_args={
        'retries': 1,
        'retry_delay': timedelta(minutes=1)
    }
) as dag:
    
    fetch_trades = PythonOperator(
        task_id='fetch_trades',
        python_callable=check_source_availability,
    )
    
    reconcile = PythonOperator(
        task_id='reconcile',
        python_callable=fetch_and_process,
    )
    
    notify = PythonOperator(
        task_id='send_notification',
        python_callable=send_notification,
    )
    
    fetch_trades >> reconcile >> notify
