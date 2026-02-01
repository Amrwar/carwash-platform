"use client";

import { useState, useEffect, useCallback } from "react";
import { WashRecord, Worker } from "@prisma/client";
import StatsCard from "@/components/StatsCard";
import {
  Car,
  DollarSign,
  CreditCard,
  Download,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

const washTypeBadges: Record<string, string> = {
  INNER: "badge-blue",
  OUTER: "badge-green",
  FULL: "badge-purple",
  FREE: "badge-gray",
};

const formatDate = (date: Date | string, format: string) => {
  const d = new Date(date);
  if (format === "yyyy-MM") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return d.toLocaleDateString();
};

const formatMoney = (amount: number) => {
  return Math.round(amount * 100) / 100;
};

const ITEMS_PER_PAGE = 15;

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const localeCode = locale === "ar" ? "ar-EG" : "en-US";

  const formatDateLocale = (date: Date | string) => {
    return new Date(date).toLocaleDateString(localeCode, { month: "short", day: "numeric" });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit" });
  };

  const [records, setRecords] = useState<WashRecordWithWorker[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => formatDate(new Date(), "yyyy-MM"));
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/wash-records?month=${selectedMonth}`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.data);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch("/api/workers");
      const data = await response.json();
      if (data.success) {
        setWorkers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchWorkers();
  }, [fetchRecords, fetchWorkers]);

  const handlePreviousMonth = () => {
    const date = new Date(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(formatDate(date, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const date = new Date(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(formatDate(date, "yyyy-MM"));
  };

  const handleExportMonthly = () => {
    window.open(`/api/export/monthly?month=${selectedMonth}`, "_blank");
  };

  // Pagination
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = records.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const instapayTips = formatMoney(records
    .filter((r) => r.paymentType === "INSTAPAY")
    .reduce((sum, r) => sum + r.tipAmount, 0));

  const totalRevenue = formatMoney(records.reduce((sum, r) => sum + r.amountPaid, 0));
  const netRevenue = formatMoney(totalRevenue - instapayTips);

  const stats = {
    totalCars: records.length,
    inProgress: records.filter((r) => r.status === "IN_PROGRESS").length,
    finished: records.filter((r) => r.status === "FINISHED").length,
    totalRevenue,
    instapayTips,
    netRevenue,
    totalCash: formatMoney(records.filter((r) => r.paymentType === "CASH").reduce((sum, r) => sum + r.amountPaid, 0)),
    totalInstapay: formatMoney(records.filter((r) => r.paymentType === "INSTAPAY").reduce((sum, r) => sum + r.amountPaid, 0)),
  };

  const byWashType = records.reduce((acc, r) => {
    if (!acc[r.washType]) {
      acc[r.washType] = { count: 0, revenue: 0 };
    }
    acc[r.washType].count++;
    acc[r.washType].revenue += r.amountPaid;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const byWorker = records.reduce((acc, r) => {
    const name = r.worker?.name || "Unassigned";
    if (!acc[name]) {
      acc[name] = { count: 0, revenue: 0, instapayTips: 0 };
    }
    acc[name].count++;
    acc[name].revenue += r.amountPaid;
    if (r.paymentType === "INSTAPAY") {
      acc[name].instapayTips += r.tipAmount;
    }
    return acc;
  }, {} as Record<string, { count: number; revenue: number; instapayTips: number }>);

  const monthDisplay = new Date(`${selectedMonth}-01`).toLocaleDateString(localeCode, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("reports.title")}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-gray-600 border-none bg-transparent cursor-pointer hover:text-gray-900"
            />
          </div>
        </div>
        <button onClick={handleExportMonthly} className="btn btn-primary">
          <Download className="w-4 h-4" />
          {t("reports.exportExcel")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard title={t("reports.totalCars")} value={stats.totalCars} subtitle={`${stats.inProgress} ${t("reports.inProgress")} · ${stats.finished} ${t("reports.finished")}`} icon={Car} color="blue" />
            <StatsCard title={t("reports.revenue")} value={`${stats.totalRevenue} ${t("common.egp")}`} subtitle={`${t("reports.cash")} ${stats.totalCash} · ${t("reports.instapay")} ${stats.totalInstapay}`} icon={DollarSign} color="purple" />
            <StatsCard title={t("reports.instapayTips")} value={`${stats.instapayTips} ${t("common.egp")}`} icon={CreditCard} color="yellow" />
            <StatsCard title={t("reports.netRevenue")} value={`${stats.netRevenue} ${t("common.egp")}`} icon={TrendingUp} color="green" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("reports.byWashType")}</h3>
              <div className="space-y-3">
                {Object.entries(byWashType).map(([type, data]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={clsx("badge", washTypeBadges[type])}>{type}</span>
                      <span className="text-gray-600">{data.count} {t("reports.cars")}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatMoney(data.revenue)} {t("common.egp")}</span>
                  </div>
                ))}
                {Object.keys(byWashType).length === 0 && (
                  <p className="text-gray-500 text-center py-4">{t("common.noData")}</p>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("reports.byWorker")}</h3>
              <div className="space-y-3">
                {Object.entries(byWorker)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([name, data]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-sm text-gray-500">
                          {data.count} {t("reports.cars")}
                          {data.instapayTips > 0 && (
                            <span className="text-amber-600"> - {t("reports.instapayTips")}: {formatMoney(data.instapayTips)} {t("common.egp")}</span>
                          )}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900">{formatMoney(data.revenue)} {t("common.egp")}</span>
                    </div>
                  ))}
                {Object.keys(byWorker).length === 0 && (
                  <p className="text-gray-500 text-center py-4">{t("common.noData")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("reports.allRecords")} ({records.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("reports.date")}</th>
                    <th>{t("reports.plate")}</th>
                    <th>{t("reports.type")}</th>
                    <th>{t("reports.worker")}</th>
                    <th>{t("reports.entry")}</th>
                    <th>{t("reports.duration")}</th>
                    <th>{t("reports.payment")}</th>
                    <th>{t("reports.amount")}</th>
                    <th>{t("reports.instapayTip")}</th>
                    <th>{t("reports.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-500">
                        {t("reports.noRecords")}
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="text-gray-600">
                          {formatDateLocale(record.entryTime)}
                        </td>
                        <td>
                          <span className="font-mono font-semibold text-gray-900">
                            {record.plateNumber}
                          </span>
                        </td>
                        <td>
                          <span className={clsx("badge", washTypeBadges[record.washType])}>
                            {record.washType}
                          </span>
                        </td>
                        <td className="text-gray-700">{record.worker?.name || "-"}</td>
                        <td className="text-gray-600">{formatTime(record.entryTime)}</td>
                        <td className="text-gray-600">
                          {record.elapsedMinutes !== null ? `${record.elapsedMinutes} ${t("reports.min")}` : "-"}
                        </td>
                        <td>
                          {record.paymentType ? (
                            <span
                              className={clsx(
                                "badge",
                                record.paymentType === "CASH" ? "badge-green" : "badge-blue"
                              )}
                            >
                              {record.paymentType}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="font-medium text-gray-900">
                          {record.amountPaid > 0 ? `${formatMoney(record.amountPaid)} ${t("common.egp")}` : "-"}
                        </td>
                        <td className="text-amber-600 font-medium">
                          {record.paymentType === "INSTAPAY" && record.tipAmount > 0
                            ? `${formatMoney(record.tipAmount)} ${t("common.egp")}`
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={clsx(
                              "badge",
                              record.status === "FINISHED" ? "badge-green" : "badge-yellow"
                            )}
                          >
                            {record.status === "FINISHED" ? t("reports.done") : t("reports.active")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {t("common.showing")} {startIndex + 1} {t("common.to")} {Math.min(startIndex + ITEMS_PER_PAGE, records.length)} {t("common.of")} {records.length} {t("common.records")}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={clsx(
                            "w-8 h-8 rounded-lg text-sm font-medium",
                            currentPage === page
                              ? "bg-red-600 text-white"
                              : "hover:bg-gray-100 text-gray-600"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
