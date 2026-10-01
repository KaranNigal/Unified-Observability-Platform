import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8080/health", {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        status: "unhealthy",
        webserver: "offline",
        scheduler: "unknown",
        error: `HTTP ${res.status}`
      }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({
      status: "healthy",
      webserver: data?.metadatabase?.status || "healthy",
      scheduler: data?.scheduler?.status || "healthy",
      data
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "unreachable",
      webserver: "unreachable",
      scheduler: "unreachable",
      error: err.message
    }, { status: 200 });
  }
}
