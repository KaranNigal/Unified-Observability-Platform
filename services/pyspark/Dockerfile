FROM apache/spark:3.5.4

USER root
COPY requirements.txt /opt/spark/work-dir/requirements.txt
RUN pip install --no-cache-dir -r /opt/spark/work-dir/requirements.txt

COPY synthetic_batch_job.py /opt/spark/work-dir/synthetic_batch_job.py
RUN chown -R 185:185 /opt/spark/work-dir/

USER 185

CMD ["spark-submit", "--master", "spark://spark-master:7077", "/opt/spark/work-dir/synthetic_batch_job.py"]
