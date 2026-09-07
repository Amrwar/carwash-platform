import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isSearchablePlateQuery, summarizeCustomerHistory } from "@/lib/customer-history";
import { plateSpellings } from "@/lib/plates";

/** How many recent washes the customer card is worked out from. */
const SEARCH_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get("plate");

    if (!isSearchablePlateQuery(plate)) {
      return NextResponse.json({ success: true, data: null });
    }

    const records = await prisma.washRecord.findMany({
      where: {
        OR: plateSpellings(plate!).map((spelling) => ({
          plateNumber: { contains: spelling },
        })),
      },
      orderBy: { entryTime: "desc" },
      take: SEARCH_LIMIT,
      select: {
        id: true,
        plateNumber: true,
        carType: true,
        phoneNumber: true,
        washType: true,
        amountPaid: true,
        entryTime: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: summarizeCustomerHistory(records, plate!),
    });
  } catch (error) {
    console.error("Error searching customer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search customer" },
      { status: 500 }
    );
  }
}
