import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePlate } from "@/lib/plates";
import { resolveRecordWindow } from "@/lib/record-window";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { start, end } = resolveRecordWindow({
      date: searchParams.get("date"),
      month: searchParams.get("month"),
    });

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
      plateNumber: normalizePlate(body.plateNumber),
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
