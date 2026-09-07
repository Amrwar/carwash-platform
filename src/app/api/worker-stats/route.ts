import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cairoDayWindow, cairoMonthWindow, cairoWeekWindow } from '@/lib/record-window';
import { countByWashType, summarizeWashRecords } from '@/lib/wash-stats';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // day, week, month
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    const { start: startDate, end: endDate } =
      period === 'week'
        ? cairoWeekWindow(dateStr)
        : period === 'month'
          ? cairoMonthWindow(searchParams.get('month'))
          : cairoDayWindow(dateStr);

    // Get all workers
    const workers = await prisma.worker.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all records in the period
    const records = await prisma.washRecord.findMany({
      where: {
        entryTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { worker: true },
    });

    // Calculate stats per worker
    const workerStats = workers.map((worker) => {
      const workerRecords = records.filter((r) => r.workerId === worker.id);
      return {
        worker,
        stats: {
          ...summarizeWashRecords(workerRecords),
          byWashType: countByWashType(workerRecords),
        },
      };
    });

    // Also include unassigned stats
    const unassignedRecords = records.filter((r) => !r.workerId);
    const unassignedStats = {
      worker: null,
      stats: {
        ...summarizeWashRecords(unassignedRecords),
        byWashType: countByWashType(unassignedRecords),
      },
    };

    // Calculate totals
    const totals = summarizeWashRecords(records);

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        workerStats: [...workerStats.filter(ws => ws.stats.totalCars > 0), 
                      ...(unassignedStats.stats.totalCars > 0 ? [unassignedStats] : [])],
        allWorkerStats: workerStats,
        unassignedStats,
        totals,
      },
    });
  } catch (error) {
    console.error('Error fetching worker stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch worker stats' },
      { status: 500 }
    );
  }
}
