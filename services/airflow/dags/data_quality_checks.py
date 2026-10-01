import json
import logging
import os
import socket
import uuid
from datetime import UTC, datetime, timedelta

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


def run_task(**context):
    dag_id = context["dag"].dag_id
    task_id = context["task"].task_id
    logger.info(
        get_structured_log(f"Starting {task_id}", dag_id=dag_id, task_id=task_id)
    )
    logger.info(
        get_structured_log(f"Completed {task_id}", dag_id=dag_id, task_id=task_id)
    )


with DAG(
    dag_id="data_quality_checks",
    schedule="*/30 * * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["demo", "quality", "monitoring"],
    default_args={"retries": 1, "retry_delay": timedelta(minutes=1)},
) as dag:

    check_nulls = PythonOperator(
        task_id="check_nulls",
        python_callable=run_task,
    )

    check_foreign_keys = PythonOperator(
        task_id="check_foreign_keys",
        python_callable=run_task,
    )

    check_nulls >> check_foreign_keys
