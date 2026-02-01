"use client";

import { useState, useEffect, useCallback } from "react";
import { MechanicRecord } from "@prisma/client";
import StatsCard from "@/components/StatsCard";
import {
  Plus,
  Wrench,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Loader2,
  Droplets,
  Settings,
} from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/i18n/context";
import AddOilServiceModal from "@/components/AddOilServiceModal";
import AddOtherServiceModal from "@/components/AddOtherServiceModal";

export default function MechanicPage() {
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<MechanicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOilModal, setShowOilModal] = useState(false);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const fetchRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/mechanic?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) setRecords(data.data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]);

  const handleAddSuccess = (newRecord: MechanicRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("mechanic.deleteConfirm"))) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/mechanic/${id}`, { method: "DELETE" });
      if (response.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePayment = async (id: string, received: boolean) => {
    setTogglingPayment(id);
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, paymentReceived: received } : r)));
    
    try {
      await fetch(`/api/mechanic/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReceived: received }),
      });
    } catch (error) {
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, paymentReceived: !received } : r)));
      console.error("Failed to toggle payment:", error);
    } finally {
      setTogglingPayment(null);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatOilType = (type: string | null) => {
    if (!type) return "-";
    switch (type) {
      case "SHELL_4L": return t("mechanic.shell4l");
      case "SHELL_5L": return t("mechanic.shell5l");
      case "CUSTOMER_OWN": return t("mechanic.customerOil");
      default: return type;
    }
  };

  const formatServiceType = (type: string | null) => {
    if (!type) return "-";
    return type === "OIL_ONLY" ? t("mechanic.oilOnly") : t("mechanic.oilAndFilter");
  };

  const oilRecords = records.filter((r) => r.category === "OIL_SERVICE");
  const otherRecords = records.filter((r) => r.category === "OTHER_SERVICE");

  const stats = {
    total: records.length,
    totalRevenue: records.reduce((sum, r) => sum + r.totalAmount, 0),
    oilServices: oilRecords.length,
    oilRevenue: oilRecords.reduce((sum, r) => sum + r.totalAmount, 0),
    otherServices: otherRecords.length,
    otherRevenue: otherRecords.reduce((sum, r) => sum + r.totalAmount, 0),
    received: records.filter((r) => r.paymentReceived).reduce((sum, r) => sum + r.totalAmount, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-red-600" />
            {isToday ? t("mechanic.title") : t("mechanic.titleOther")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => navigateDate("prev")} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-gray-600 border-none bg-transparent cursor-pointer hover:text-gray-900"
              />
            </div>
            <button onClick={() => navigateDate("next")} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-sm text-red-600 hover:text-red-700 font-medium ms-2"
              >
                {t("mechanic.goToToday")}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowOilModal(true)} className="btn btn-primary">
            <Droplets className="w-4 h-4" />
            {t("mechanic.oilService")}
          </button>
          <button onClick={() => setShowOtherModal(true)} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            {t("mechanic.otherService")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title={t("mechanic.totalServices")} value={stats.total} icon={Wrench} color="blue" />
        <StatsCard title={t("mechanic.totalRevenue")} value={`${stats.totalRevenue} ${t("common.egp")}`} subtitle={`${t("mechanic.oil")} ${stats.oilRevenue} · ${t("mechanic.other")} ${stats.otherRevenue}`} icon={DollarSign} color="purple" />
        <StatsCard title={t("mechanic.received")} value={`${stats.received} ${t("common.egp")}`} icon={Check} color="green" />
        <StatsCard title={t("mechanic.unreceived")} value={`${stats.totalRevenue - stats.received} ${t("common.egp")}`} icon={DollarSign} color="red" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">{t("mechanic.loadingRecords")}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t("mechanic.noRecords")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("mechanic.time")}</th>
                  <th>{t("mechanic.plate")}</th>
                  <th>{t("mechanic.carType")}</th>
                  <th>{t("mechanic.category")}</th>
                  <th>{t("mechanic.service")}</th>
                  <th>{t("mechanic.details")}</th>
                  <th>{t("common.total")}</th>
                  <th>{t("mechanic.payment")}</th>
                  <th className="text-center">{t("table.received")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="text-gray-600">{formatTime(record.createdAt)}</td>
                    <td className="font-medium text-gray-900">{record.plateNumber}</td>
                    <td className="text-gray-600">{record.carType || "-"}</td>
                    <td>
                      <span className={clsx(
                        "badge",
                        record.category === "OIL_SERVICE" ? "badge-yellow" : "badge-purple"
                      )}>
                        {record.category === "OIL_SERVICE" ? "Oil" : "Other"}
                      </span>
                    </td>
                    <td>
                      {record.category === "OIL_SERVICE" ? (
                        <span className={clsx(
                          "badge",
                          record.serviceType === "OIL_ONLY" ? "badge-blue" : "badge-green"
                        )}>
                          {formatServiceType(record.serviceType)}
                        </span>
                      ) : (
                        <span className="font-medium text-gray-900">{record.serviceName}</span>
                      )}
                    </td>
                    <td className="text-gray-600 text-sm">
                      {record.category === "OIL_SERVICE" ? (
                        <div>
                          <div>{formatOilType(record.oilType)}: {record.oilPrice} {t("common.egp")}</div>
                          <div>{t("mechanic.labor")}: {record.laborCost} {t("common.egp")}</div>
                          {record.filterPrice > 0 && <div>{t("mechanic.filter")}: {record.filterPrice} {t("common.egp")}</div>}
                        </div>
                      ) : (
                        <div>{record.servicePrice} {t("common.egp")}</div>
                      )}
                    </td>
                    <td className="font-semibold text-gray-900">{record.totalAmount} {t("common.egp")}</td>
                    <td>
                      {record.paymentType && (
                        <span className={clsx(
                          "badge",
                          record.paymentType === "CASH" ? "badge-green" : "badge-blue"
                        )}>
                          {record.paymentType}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleTogglePayment(record.id, !record.paymentReceived)}
                        disabled={togglingPayment === record.id}
                        className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all mx-auto",
                          record.paymentReceived
                            ? "bg-green-100 text-green-600 hover:bg-green-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {togglingPayment === record.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : record.paymentReceived ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                      >
                        {deletingId === record.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddOilServiceModal
        isOpen={showOilModal}
        onClose={() => setShowOilModal(false)}
        onSuccess={handleAddSuccess}
      />

      <AddOtherServiceModal
        isOpen={showOtherModal}
        onClose={() => setShowOtherModal(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
