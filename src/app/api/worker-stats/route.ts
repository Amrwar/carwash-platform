import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCairoDayStart, getCairoDayEnd, getCairoMonthStart, getCairoMonthEnd } from '@/lib/date-utils';
import { monthStartDate, resolveMonthString } from '@/lib/month';
import { countByWashType, summarizeWashRecords } from '@/lib/wash-stats';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // day, week, month
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    let startDate: Date;
    let endDate: Date;

    const baseDate = dateStr ? new Date(dateStr) : new Date();

    if (period === 'day') {
      startDate = getCairoDayStart(baseDate);
      endDate = getCairoDayEnd(baseDate);
    } else if (period === 'week') {
      // Get start of week (Sunday)
      const day = baseDate.getDay();
      const weekStart = new Date(baseDate);
      weekStart.setDate(baseDate.getDate() - day);
      startDate = getCairoDayStart(weekStart);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      endDate = getCairoDayEnd(weekEnd);
    } else if (period === 'month') {
      const monthStr = resolveMonthString(searchParams.get('month'), baseDate);
      const monthDate = monthStartDate(monthStr, baseDate);
      startDate = getCairoMonthStart(monthDate);
      endDate = getCairoMonthEnd(monthDate);
    } else {
      startDate = getCairoDayStart(baseDate);
      endDate = getCairoDayEnd(baseDate);
    }

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
