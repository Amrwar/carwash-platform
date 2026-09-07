import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validationMessage } from "@/lib/request-errors";
import { buildMechanicRecordInput } from "@/lib/mechanic-record";
import { resolveRecordWindow } from "@/lib/record-window";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { start, end } = resolveRecordWindow({
      date: searchParams.get("date"),
      month: searchParams.get("month"),
    });

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
    return NextResponse.json(
      { success: false, error: validationMessage(error, "Invalid mechanic record") },
      { status: 400 }
    );
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