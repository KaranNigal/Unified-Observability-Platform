import json
import os

import demo_data as demo
import google.generativeai as genai
from auth import TenantContext, get_current_tenant
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

load_dotenv()

router = APIRouter(tags=["rca"])

# Configure Gemini AI
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


class RcaRequest(BaseModel):
    incident_type: (
        str  # e.g., "airflow_dag_failure", "alert", "service_error", "kafka_lag"
    )
    identifier: str  # e.g., "recon_settlement_job", "KafkaConsumerLagHigh"
    time_window: str = "15m"


class RcaResponse(BaseModel):
    explanation: str
    root_cause: str
    troubleshooting_steps: list[str]


@router.post("/api/v1/rca/analyze", response_model=RcaResponse)
async def analyze_incident(
    request: RcaRequest, tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """
    AI-Powered Root Cause Analysis endpoint using Google Gemini.
    """
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in the environment variables.",
        )

    # Gather context based on incident type
    context_data = ""
    tenant_id = tenant_ctx.tenant_id

    # If it's the demo tenant, we can pull some specific mock data as context for the AI
    if demo.is_demo(tenant_id):
        if request.incident_type == "airflow_dag_failure":
            dags = [
                d
                for d in demo.DEMO_AIRFLOW_DAGS
                if d.get("dag_id") == request.identifier
            ]
            tasks = demo.DEMO_AIRFLOW_TASKS.get(request.identifier, [])
            context_data = f"DAG Stats: {dags}\nTasks: {tasks}"

        elif request.incident_type == "alert":
            # Just read the hardcoded active_alerts from demo_data for context
            context_data = "Alert: KafkaConsumerLagHigh is firing for topic 'feature-bus'. Consumer lag is 312."

    prompt = f"""
You are an expert Site Reliability Engineer (SRE) and Data Engineer.
Analyze the following incident and provide a Root Cause Analysis (RCA).

Incident Type: {request.incident_type}
Identifier (Failed component): {request.identifier}
Time Window: {request.time_window}
Tenant Context: {tenant_id}

Telemetry/Context Data available:
{context_data if context_data else "No additional context data available."}

Generate a JSON object with the following schema:
{{
  "explanation": "A clear, plain-english 1-2 sentence explanation of what failed and the impact.",
  "root_cause": "A technical 1-2 sentence explanation of the underlying root cause.",
  "troubleshooting_steps": [
    "Actionable step 1",
    "Actionable step 2",
    "Actionable step 3"
  ]
}}

Ensure the response is STRICTLY valid JSON without any markdown formatting wrappers (no ```json).
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = await model.generate_content_async(prompt)

        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]

        parsed = json.loads(text)
        return RcaResponse(
            explanation=parsed.get("explanation", "Failed to parse explanation."),
            root_cause=parsed.get("root_cause", "Failed to parse root cause."),
            troubleshooting_steps=parsed.get(
                "troubleshooting_steps", ["No steps provided."]
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")
