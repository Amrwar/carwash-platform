import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCairoDayStart, getCairoDayEnd, getCairoMonthStart, getCairoMonthEnd } from '@/lib/date-utils';
import { monthStartDate, resolveMonthString } from '@/lib/month';

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
      
      const totalCars = workerRecords.length;
      const finishedCars = workerRecords.filter((r) => r.status === 'FINISHED').length;
      const totalRevenue = workerRecords.reduce((sum, r) => sum + r.amountPaid, 0);
      const totalTips = workerRecords.reduce((sum, r) => sum + r.tipAmount, 0);
      
      // InstaPay tips = tips from records where payment was InstaPay
      const instapayTips = workerRecords
        .filter((r) => r.paymentType === 'INSTAPAY')
        .reduce((sum, r) => sum + r.tipAmount, 0);
      
      // Cash tips
      const cashTips = workerRecords
        .filter((r) => r.paymentType === 'CASH')
        .reduce((sum, r) => sum + r.tipAmount, 0);
      
      // Revenue breakdown
      const cashRevenue = workerRecords
        .filter((r) => r.paymentType === 'CASH')
        .reduce((sum, r) => sum + r.amountPaid, 0);
      
      const instapayRevenue = workerRecords
        .filter((r) => r.paymentType === 'INSTAPAY')
        .reduce((sum, r) => sum + r.amountPaid, 0);
      
      // Net revenue (Revenue - InstaPay Tips that need to be given to worker)
      const netRevenue = totalRevenue - instapayTips;

      // Wash type breakdown
      const byWashType = {
        INNER: workerRecords.filter((r) => r.washType === 'INNER').length,
        OUTER: workerRecords.filter((r) => r.washType === 'OUTER').length,
        FULL: workerRecords.filter((r) => r.washType === 'FULL').length,
        FREE: workerRecords.filter((r) => r.washType === 'FREE').length,
      };

      return {
        worker,
        stats: {
          totalCars,
          finishedCars,
          totalRevenue,
          totalTips,
          instapayTips,
          cashTips,
          cashRevenue,
          instapayRevenue,
          netRevenue,
          byWashType,
        },
      };
    });

    // Also include unassigned stats
    const unassignedRecords = records.filter((r) => !r.workerId);
    const unassignedStats = {
      worker: null,
      stats: {
        totalCars: unassignedRecords.length,
        finishedCars: unassignedRecords.filter((r) => r.status === 'FINISHED').length,
        totalRevenue: unassignedRecords.reduce((sum, r) => sum + r.amountPaid, 0),
        totalTips: unassignedRecords.reduce((sum, r) => sum + r.tipAmount, 0),
        instapayTips: unassignedRecords
          .filter((r) => r.paymentType === 'INSTAPAY')
          .reduce((sum, r) => sum + r.tipAmount, 0),
        cashTips: unassignedRecords
          .filter((r) => r.paymentType === 'CASH')
          .reduce((sum, r) => sum + r.tipAmount, 0),
        cashRevenue: unassignedRecords
          .filter((r) => r.paymentType === 'CASH')
          .reduce((sum, r) => sum + r.amountPaid, 0),
        instapayRevenue: unassignedRecords
          .filter((r) => r.paymentType === 'INSTAPAY')
          .reduce((sum, r) => sum + r.amountPaid, 0),
        netRevenue: unassignedRecords.reduce((sum, r) => sum + r.amountPaid, 0) -
          unassignedRecords
            .filter((r) => r.paymentType === 'INSTAPAY')
            .reduce((sum, r) => sum + r.tipAmount, 0),
        byWashType: {
          INNER: unassignedRecords.filter((r) => r.washType === 'INNER').length,
          OUTER: unassignedRecords.filter((r) => r.washType === 'OUTER').length,
          FULL: unassignedRecords.filter((r) => r.washType === 'FULL').length,
          FREE: unassignedRecords.filter((r) => r.washType === 'FREE').length,
        },
      },
    };

    // Calculate totals
    const totals = {
      totalCars: records.length,
      finishedCars: records.filter((r) => r.status === 'FINISHED').length,
      totalRevenue: records.reduce((sum, r) => sum + r.amountPaid, 0),
      totalTips: records.reduce((sum, r) => sum + r.tipAmount, 0),
      instapayTips: records
        .filter((r) => r.paymentType === 'INSTAPAY')
        .reduce((sum, r) => sum + r.tipAmount, 0),
      cashTips: records
        .filter((r) => r.paymentType === 'CASH')
        .reduce((sum, r) => sum + r.tipAmount, 0),
      cashRevenue: records
        .filter((r) => r.paymentType === 'CASH')
        .reduce((sum, r) => sum + r.amountPaid, 0),
      instapayRevenue: records
        .filter((r) => r.paymentType === 'INSTAPAY')
        .reduce((sum, r) => sum + r.amountPaid, 0),
      netRevenue: records.reduce((sum, r) => sum + r.amountPaid, 0) -
        records
          .filter((r) => r.paymentType === 'INSTAPAY')
          .reduce((sum, r) => sum + r.tipAmount, 0),
    };

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
