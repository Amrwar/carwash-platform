import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { excelDownloadHeaders, generateExcelReport } from "@/lib/excel";
import { cairoMonthWindow, resolveCairoMonthString } from "@/lib/record-window";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = resolveCairoMonthString(searchParams.get("month"));
    const { start, end } = cairoMonthWindow(month);
    const records = await prisma.washRecord.findMany({
      where: { entryTime: { gte: start, lte: end } },
      include: { worker: true },
      orderBy: { entryTime: "asc" },
    });
    const buffer = await generateExcelReport(records, "monthly", month);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: excelDownloadHeaders(month),
    });
  } catch (error) {
    console.error("Error generating monthly export:", error);
    return NextResponse.json({ success: false, error: "Failed to generate export" }, { status: 500 });
  }
}
