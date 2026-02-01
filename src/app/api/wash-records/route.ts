import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCairoDayStart, getCairoDayEnd, getCairoMonthStart, getCairoMonthEnd, formatCairoDate } from "@/lib/date-utils";

function normalizeDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

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

    const records = await prisma.washRecord.findMany({
      where: {
        entryTime: {
          gte: start,
          lte: end,
        },
      },
      include: { worker: true },
      orderBy: { entryTime: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching wash records:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch wash records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const recordData: Record<string, unknown> = {
      plateNumber: normalizeDigits(body.plateNumber.trim()).toUpperCase(),
      carType: body.carType || null,
      phoneNumber: body.phoneNumber || null,
      washType: body.washType,
      amountPaid: body.washType === "FREE" ? 0 : body.amountPaid || 0,
      tipAmount: body.tipAmount || 0,
      notes: body.notes || null,
      status: "IN_PROGRESS",
    };

    if (body.washType === "FREE") {
      recordData.paymentType = null;
    } else if (body.paymentType) {
      recordData.paymentType = body.paymentType;
    }

    if (body.workerId) {
      recordData.workerId = body.workerId;
    }

    const record = await prisma.washRecord.create({
      data: recordData as any,
      include: { worker: true },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("Error creating wash record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create wash record" },
      { status: 500 }
    );
  }
}
