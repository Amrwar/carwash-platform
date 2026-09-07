import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ZodError } from "zod";
import { getCairoDayStart, getCairoDayEnd, getCairoMonthStart, getCairoMonthEnd } from "@/lib/date-utils";
import { buildMechanicRecordInput } from "@/lib/mechanic-record";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    let start: Date;
    let end: Date;

    if (date) {
      const targetDate = new Date(date);
      start = getCairoDayStart(targetDate);
      end = getCairoDayEnd(targetDate);
    } else if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const targetDate = new Date(year, monthNum - 1, 1);
      start = getCairoMonthStart(targetDate);
      end = getCairoMonthEnd(targetDate);
    } else {
      const today = new Date();
      start = getCairoDayStart(today);
      end = getCairoDayEnd(today);
    }

    const records = await prisma.mechanicRecord.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching mechanic records:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mechanic records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let data;
  try {
    data = buildMechanicRecordInput(await request.json());
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.errors[0]?.message ?? "Invalid mechanic record"
        : "Invalid mechanic record";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  try {
    const record = await prisma.mechanicRecord.create({ data });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("Error creating mechanic record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create mechanic record" },
      { status: 500 }
    );
  }
}