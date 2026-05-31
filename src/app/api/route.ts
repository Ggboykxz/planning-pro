import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ app: "PlanningPro", version: "1.0.0" });
}