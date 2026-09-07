import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildCancellationUpdate } from "@/lib/cancellation";
import { validationMessage } from "@/lib/request-errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let data;
  try {
    data = buildCancellationUpdate(await request.json().catch(() => ({})));
  } catch (error) {
    return NextResponse.json(
      { success: false, error: validationMessage(error, "Invalid cancellation") },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const record = await prisma.washRecord.update({
      where: { id },
      data,
      include: { worker: true },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Error cancelling wash record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel wash record" },
      { status: 500 }
    );
  }
}