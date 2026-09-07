import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { UpdateWorkerSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let data;
  try {
    data = UpdateWorkerSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.errors[0]?.message ?? "Invalid worker"
        : "Invalid worker";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  try {
    const { id } = await params;

    const worker = await prisma.worker.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: worker });
  } catch (error) {
    console.error("Error updating worker:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update worker" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if worker has any records
    const recordCount = await prisma.washRecord.count({
      where: { workerId: id },
    });

    if (recordCount > 0) {
      // Soft delete - just mark as inactive
      await prisma.worker.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no records
      await prisma.worker.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting worker:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete worker" },
      { status: 500 }
    );
  }
}