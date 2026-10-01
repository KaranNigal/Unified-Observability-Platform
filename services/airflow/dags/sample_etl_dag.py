import json
import logging
import os
import random
import socket
import time
import uuid
from datetime import UTC, datetime

from airflow import DAG
from airflow.operators.python import PythonOperator

TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))


def get_structured_log(
    message,
    log_level="INFO",
    trace_id=None,
    dag_id=None,
    task_id=None,
    extra_fields=None,
):
    if trace_id is None:
        trace_id = str(uuid.uuid4())
    log_data = {
        "timestamp": datetime.now(UTC).isoformat(),
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


def extract_data(**context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    logger.info(
        get_structured_log("Starting extraction", dag_id=dag_id, task_id=task_id)
    )
    time.sleep(random.uniform(2, 8))
    logger.info(
        get_structured_log("Extraction completed", dag_id=dag_id, task_id=task_id)
    )


def validate_data(**context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    logger.info(
        get_structured_log("Starting validation", dag_id=dag_id, task_id=task_id)
    )
    time.sleep(random.uniform(1, 3))
    if random.random() < 0.3:
        logger.warning(
            get_structured_log(
                "Data quality issues detected",
                log_level="WARNING",
                dag_id=dag_id,
                task_id=task_id,
            )
        )
    logger.info(
        get_structured_log("Validation completed", dag_id=dag_id, task_id=task_id)
    )


def transform_data(**context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    logger.info(
        get_structured_log("Starting transformation", dag_id=dag_id, task_id=task_id)
    )
    time.sleep(random.uniform(3, 10))
    logger.info(
        get_structured_log("Transformation completed", dag_id=dag_id, task_id=task_id)
    )


def load_data(**context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    logger.info(get_structured_log("Starting load", dag_id=dag_id, task_id=task_id))
    time.sleep(random.uniform(1, 5))
    logger.info(get_structured_log("Load completed", dag_id=dag_id, task_id=task_id))


with DAG(
    dag_id="sample_etl_pipeline",
    schedule="*/5 * * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["etl", "sample", "observability", "demo"],
) as dag:

    extract = PythonOperator(
        task_id="extract_data",
        python_callable=extract_data,
    )

    validate = PythonOperator(
        task_id="validate_data",
        python_callable=validate_data,
    )

    transform = PythonOperator(
        task_id="transform_data",
        python_callable=transform_data,
    )

    load = PythonOperator(
        task_id="load_data",
        python_callable=load_data,
    )

    extract >> validate >> transform >> load
