"""
Airflow DAG: production_dwh_etl_pipeline
Description: Extract raw business records, validate schemas, transform aggregations, and load into PostgreSQL warehouse.
Author: airflow
Generated via Capsule Data Observability Platform
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
}


def extract_source_data(**context):
    print("Extracting staging data from source systems...")
    return {"extracted_rows": 15420, "timestamp": str(datetime.utcnow())}


def validate_schema_quality(**context):
    ti = context["ti"]
    meta = ti.xcom_pull(task_ids="extract_staging_data")
    print(
        f"Validating {meta.get('extracted_rows', 0)} records against schema constraints..."
    )
    return True


def transform_aggregates(**context):
    print("Computing metrics: 1h VWAP, active users, session counts...")
    return {"transformed_rows": 15420, "status": "CLEAN"}


def load_into_dwh(**context):
    print("Upserting transformed batches into PostgreSQL analytics tables...")
    return "SUCCESS"


with DAG(
    dag_id="production_dwh_etl_pipeline",
    default_args=default_args,
    description="Extract raw business records, validate schemas, transform aggregations, and load into PostgreSQL warehouse.",
    schedule_interval="0 */4 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["etl", "postgres", "data-warehouse", "batch", "demo"],
) as dag:

    extract_task = PythonOperator(
        task_id="extract_staging_data",
        python_callable=extract_source_data,
    )

    validate_task = PythonOperator(
        task_id="validate_schema_quality",
        python_callable=validate_schema_quality,
    )

    transform_task = PythonOperator(
        task_id="transform_business_aggregates",
        python_callable=transform_aggregates,
    )

    load_task = PythonOperator(
        task_id="load_into_postgres_dwh",
        python_callable=load_into_dwh,
    )

    extract_task >> validate_task >> transform_task >> load_task
