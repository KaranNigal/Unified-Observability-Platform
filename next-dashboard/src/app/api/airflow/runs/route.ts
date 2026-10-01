import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dagId = searchParams.get("dag_id");
    const limit = searchParams.get("limit") || "10";

    if (!dagId) {
      return NextResponse.json({ error: "Missing dag_id parameter" }, { status: 400 });
    }

    const auth = Buffer.from("admin:Niraj@31").toString("base64");
    
    const res = await fetch(`http://127.0.0.1:8080/api/v1/dags/${encodeURIComponent(dagId)}/dagRuns?limit=${limit}&order_by=-execution_date`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      return NextResponse.json({ dag_runs: [], total_entries: 0, error: await res.text() }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ dag_runs: [], total_entries: 0, error: err.message }, { status: 200 });
  }
}
