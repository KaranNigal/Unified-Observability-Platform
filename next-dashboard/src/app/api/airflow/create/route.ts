import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { dag_id, filename, code } = await request.json();

    if (!dag_id || !code) {
      return NextResponse.json({ error: "Missing dag_id or python code" }, { status: 400 });
    }

    // Sanitize dag_id to prevent path traversal
    const safeDagId = dag_id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const finalFileName = (filename ? filename.replace(/[^a-zA-Z0-9_.-]/g, "_") : `${safeDagId}.py`).endsWith(".py") 
      ? (filename || `${safeDagId}.py`) 
      : `${filename || safeDagId}.py`;

    const dagsDir = path.resolve(process.cwd(), "..", "services", "airflow", "dags");
    
    // Ensure dir exists
    await fs.mkdir(dagsDir, { recursive: true });

    const targetFilePath = path.join(dagsDir, finalFileName);

    await fs.writeFile(targetFilePath, code, "utf-8");

    return NextResponse.json({
      success: true,
      dag_id: safeDagId,
      filename: finalFileName,
      path: targetFilePath,
      message: `Pipeline '${safeDagId}' successfully deployed to Airflow DAGs repository.`
    });
  } catch (err: any) {
    console.error("Error creating DAG:", err);
    return NextResponse.json({ error: err.message || "Failed to create DAG file" }, { status: 500 });
  }
}
