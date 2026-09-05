import ExcelJS from 'exceljs';
import { WashRecord, Worker } from '@prisma/client';
import { formatCairoDateTime } from './date-utils';
import { groupByWashType, groupByWorker, summarizeWashRecords } from './wash-stats';

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

export async function generateExcelReport(
  records: WashRecordWithWorker[],
  reportType: 'daily' | 'monthly',
  dateStr: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Car Wash App';
  workbook.created = new Date();

  // Records Sheet
  const recordsSheet = workbook.addWorksheet('Records');
  
  recordsSheet.columns = [
    { header: 'Plate Number', key: 'plateNumber', width: 15 },
    { header: 'Car Type', key: 'carType', width: 20 },
    { header: 'Wash Type', key: 'washType', width: 12 },
    { header: 'Worker', key: 'worker', width: 15 },
    { header: 'Entry Time', key: 'entryTime', width: 20 },
    { header: 'Finish Time', key: 'finishTime', width: 20 },
    { header: 'Elapsed Minutes', key: 'elapsedMinutes', width: 15 },
    { header: 'Payment Type', key: 'paymentType', width: 13 },
    { header: 'Amount Paid (EGP)', key: 'amountPaid', width: 17 },
    { header: 'Tip Amount (EGP)', key: 'tipAmount', width: 15 },
    { header: 'Notes', key: 'notes', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header row
  recordsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  recordsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' },
  };
  recordsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  for (const record of records) {
    recordsSheet.addRow({
      plateNumber: record.plateNumber,
      carType: record.carType || '-',
      washType: record.washType,
      worker: record.worker?.name || '-',
      entryTime: formatCairoDateTime(record.entryTime),
      finishTime: record.finishTime ? formatCairoDateTime(record.finishTime) : '-',
      elapsedMinutes: record.elapsedMinutes ?? '-',
      paymentType: record.paymentType || '-',
      amountPaid: record.amountPaid,
      tipAmount: record.tipAmount,
      notes: record.notes || '-',
      status: record.status,
    });
  }

  // Add borders to all cells
  recordsSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle' };
    }
  });

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const summary = summarizeWashRecords(records);
  const byWashType = groupByWashType(records);
  const byWorker = groupByWorker(records);

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' },
  };

  const summaryRows = [
    { metric: 'Report Date', value: dateStr },
    { metric: 'Report Type', value: reportType === 'daily' ? 'Daily Report' : 'Monthly Report' },
    { metric: '', value: '' },
    { metric: 'Total Cars', value: summary.totalCars },
    { metric: 'Finished Cars', value: summary.finishedCars },
    { metric: 'In Progress Cars', value: summary.inProgressCars },
    { metric: '', value: '' },
    { metric: 'Total Revenue (EGP)', value: summary.totalRevenue },
    { metric: 'Total Tips (EGP)', value: summary.totalTips },
    { metric: 'Total Cash (EGP)', value: summary.cashRevenue },
    { metric: 'Total InstaPay (EGP)', value: summary.instapayRevenue },
    { metric: '', value: '' },
    { metric: '--- Breakdown by Wash Type ---', value: '' },
  ];

  for (const [type, data] of Object.entries(byWashType)) {
    summaryRows.push({ metric: `${type} - Count`, value: data.count });
    summaryRows.push({ metric: `${type} - Revenue (EGP)`, value: data.revenue });
  }

  summaryRows.push({ metric: '', value: '' });
  summaryRows.push({ metric: '--- Totals by Worker ---', value: '' });

  for (const [worker, data] of Object.entries(byWorker)) {
    summaryRows.push({ metric: `${worker} - Count`, value: data.count });
    summaryRows.push({ metric: `${worker} - Revenue (EGP)`, value: data.revenue });
    summaryRows.push({ metric: `${worker} - Tips (EGP)`, value: data.tips });
  }

  summaryRows.forEach(row => summarySheet.addRow(row));

  summarySheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle' };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function getExcelFilename(reportType: 'daily' | 'monthly', dateStr: string): string {
  if (reportType === 'daily') {
    return `carwash_${dateStr}.xlsx`;
  }
  return `carwash_${dateStr}.xlsx`;
}
