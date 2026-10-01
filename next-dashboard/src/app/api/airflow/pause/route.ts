import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { dag_id, is_paused } = await request.json();
    if (!dag_id) {
      return NextResponse.json({ error: "Missing dag_id" }, { status: 400 });
    }

    const auth = Buffer.from("admin:Niraj@31").toString("base64");
    
    const res = await fetch(`http://127.0.0.1:8080/api/v1/dags/${encodeURIComponent(dag_id)}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_paused: Boolean(is_paused) })
    });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
