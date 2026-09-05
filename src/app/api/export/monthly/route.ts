import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCairoMonthStart, getCairoMonthEnd } from "@/lib/date-utils";
import { monthStartDate, resolveMonthString } from "@/lib/month";
import { generateExcelReport, getExcelFilename } from "@/lib/excel";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = resolveMonthString(searchParams.get("month"));
    const targetDate = monthStartDate(month);
    const start = getCairoMonthStart(targetDate);
    const end = getCairoMonthEnd(targetDate);
    const records = await prisma.washRecord.findMany({
      where: { entryTime: { gte: start, lte: end } },
      include: { worker: true },
      orderBy: { entryTime: "asc" },
    });
    const buffer = await generateExcelReport(records, "monthly", month);
    const filename = getExcelFilename("monthly", month);
    const uint8 = new Uint8Array(buffer);
    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating monthly export:", error);
    return NextResponse.json({ success: false, error: "Failed to generate export" }, { status: 500 });
  }
}
