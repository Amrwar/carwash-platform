import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function normalizeDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function toArabicDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get("plate");

    if (!plate || plate.length < 2) {
      return NextResponse.json({ success: true, data: null });
    }

    const normalizedPlate = normalizeDigits(plate).toUpperCase();
    const arabicPlate = toArabicDigits(normalizedPlate);

    const records = await prisma.washRecord.findMany({
      where: {
        OR: [
          { plateNumber: { contains: normalizedPlate } },
          { plateNumber: { contains: arabicPlate } },
        ],
      },
      orderBy: { entryTime: "desc" },
      take: 20,
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

    if (records.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    // Group by plate number
    const plateGroups = records.reduce((acc, record) => {
      if (!acc[record.plateNumber]) {
        acc[record.plateNumber] = [];
      }
      acc[record.plateNumber].push(record);
      return acc;
    }, {} as Record<string, typeof records>);

    // Get customer info for the most matching plate
    const exactMatch = Object.keys(plateGroups).find(p => p === normalizedPlate);
    const bestMatch = exactMatch || Object.keys(plateGroups)[0];
    const customerRecords = plateGroups[bestMatch];

    const totalVisits = customerRecords.length;
    const totalSpent = customerRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    const lastVisit = customerRecords[0];
    const favoriteWashType = customerRecords
      .map(r => r.washType)
      .sort((a, b) =>
        customerRecords.filter(r => r.washType === b).length -
        customerRecords.filter(r => r.washType === a).length
      )[0];

    return NextResponse.json({
      success: true,
      data: {
        plateNumber: bestMatch,
        carType: lastVisit.carType,
        phoneNumber: lastVisit.phoneNumber,
        totalVisits,
        totalSpent,
        lastVisit: lastVisit.entryTime,
        favoriteWashType,
        isVIP: totalVisits >= 5,
        recentVisits: customerRecords.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error searching customer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search customer" },
      { status: 500 }
    );
  }
}