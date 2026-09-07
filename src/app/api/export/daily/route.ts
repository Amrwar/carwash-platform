import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { excelDownloadHeaders, generateExcelReport } from "@/lib/excel";
import { cairoDayWindow, resolveDayString } from "@/lib/record-window";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = resolveDayString(searchParams.get("date"));
    const { start, end } = cairoDayWindow(date);
    const records = await prisma.washRecord.findMany({
      where: { entryTime: { gte: start, lte: end } },
      include: { worker: true },
      orderBy: { entryTime: "asc" },
    });
    const buffer = await generateExcelReport(records, "daily", date);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: excelDownloadHeaders(date),
    });
  } catch (error) {
    console.error("Error generating daily export:", error);
    return NextResponse.json({ success: false, error: "Failed to generate export" }, { status: 500 });
  }
}
