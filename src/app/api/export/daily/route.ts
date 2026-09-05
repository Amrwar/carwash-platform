import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCairoDayStart, getCairoDayEnd, formatCairoDate } from "@/lib/date-utils";
import { excelDownloadHeaders, generateExcelReport } from "@/lib/excel";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam || formatCairoDate(new Date());
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const start = getCairoDayStart(targetDate);
    const end = getCairoDayEnd(targetDate);
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
