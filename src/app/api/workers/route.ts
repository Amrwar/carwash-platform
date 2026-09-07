import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { CreateWorkerSchema } from "@/lib/validations";

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: workers });
  } catch (error) {
    console.error("Error fetching workers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let data;
  try {
    data = CreateWorkerSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.errors[0]?.message ?? "Invalid worker"
        : "Invalid worker";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  try {
    const worker = await prisma.worker.create({
      data: { ...data, isActive: true },
    });

    return NextResponse.json({ success: true, data: worker }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating worker:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Worker with this name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create worker" },
      { status: 500 }
    );
  }
}