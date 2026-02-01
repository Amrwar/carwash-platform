"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WashRecord, Worker } from "@prisma/client";
import AddCarModal from "@/components/AddCarModal";
import EditCarModal from "@/components/EditCarModal";
import FinishModal from "@/components/FinishModal";
import CancelModal from "@/components/CancelModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import WashRecordsTable from "@/components/WashRecordsTable";
import StatsCard from "@/components/StatsCard";
import { Plus, FileSpreadsheet, Car, DollarSign, ChevronLeft, ChevronRight, Calendar, Banknote, CreditCard } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

export default function DashboardPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<WashRecordWithWorker[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WashRecordWithWorker | null>(null);
  const [finishingRecord, setFinishingRecord] = useState<WashRecordWithWorker | null>(null);
  const [cancellingRecord, setCancellingRecord] = useState<WashRecordWithWorker | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<WashRecordWithWorker | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const initialLoadDone = useRef(false);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const fetchRecords = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`/api/wash-records?date=${selectedDate}`);
      const data = await response.json();
      if (data.success) setRecords(data.data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedDate]);

  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch("/api/workers");
      const data = await response.json();
      if (data.success) setWorkers(data.data);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!initialLoadDone.current) {
        setLoading(true);
        await Promise.all([fetchRecords(), fetchWorkers()]);
        setLoading(false);
        initialLoadDone.current = true;
      } else {
        fetchRecords();
      }
    };
    loadData();
  }, [fetchRecords, fetchWorkers]);

  const handleAddWorker = async (name: string): Promise<Worker> => {
    const response = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (data.success) {
      setWorkers((prev) => [...prev, data.data]);
      return data.data;
    }
    throw new Error(data.error);
  };

  const sendWhatsAppMessage = (phoneNumber: string) => {
    let formattedPhone = phoneNumber.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "2" + formattedPhone;
    }
    if (!formattedPhone.startsWith("20")) {
      formattedPhone = "20" + formattedPhone;
    }
    const message = encodeURIComponent(t("whatsapp.message"));
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  const handleAddSuccess = (newRecord: WashRecordWithWorker) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const handleEditSuccess = (updatedRecord: WashRecordWithWorker) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
  };

  const handleFinish = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setFinishingRecord(record);
  };

  const handleFinishSuccess = (updatedRecord: WashRecordWithWorker) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    if (finishingRecord?.phoneNumber) {
      sendWhatsAppMessage(finishingRecord.phoneNumber);
    }
  };

  const handleCancel = (record: WashRecordWithWorker) => {
    setCancellingRecord(record);
  };

  const handleCancelSuccess = (updatedRecord: WashRecordWithWorker) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
  };

  const handleDelete = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setDeletingRecord(record);
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== deletedId));
  };

  const handleTogglePayment = async (id: string, received: boolean) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, paymentReceived: received } : r)));
    try {
      await fetch(`/api/wash-records/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReceived: received }),
      });
    } catch (error) {
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, paymentReceived: !received } : r)));
      console.error("Failed to toggle payment:", error);
    }
  };

  const handleProofUpdate = (updatedRecord: WashRecordWithWorker) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/export/daily?date=${selectedDate}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carwash-${selectedDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setExporting(false);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const stats = {
    total: records.length,
    inProgress: records.filter((r) => r.status === "IN_PROGRESS").length,
    finished: records.filter((r) => r.status === "FINISHED").length,
    cancelled: records.filter((r) => r.status === "CANCELLED").length,
    revenue: records.reduce((sum, r) => sum + r.amountPaid, 0),
    cashReceived: records
      .filter((r) => r.paymentType === "CASH" && r.paymentReceived)
      .reduce((sum, r) => sum + r.amountPaid, 0),
    instapayReceived: records
      .filter((r) => r.paymentType === "INSTAPAY" && r.paymentReceived)
      .reduce((sum, r) => sum + r.amountPaid, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isToday ? t("dashboard.title") : t("dashboard.titleOther")}
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
              <button onClick={goToToday} className="text-sm text-primary-600 hover:text-primary-700 font-medium ms-2">{t("dashboard.goToToday")}</button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? t("dashboard.exporting") : t("dashboard.export")}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />{t("dashboard.addCar")}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title={t("dashboard.totalCars")} value={stats.total} subtitle={`${stats.inProgress} in progress · ${stats.finished} finished · ${stats.cancelled} cancelled`} icon={Car} color="blue" />
        <StatsCard title={t("dashboard.totalRevenue")} value={`${stats.revenue} ${t("common.egp")}`} icon={DollarSign} color="purple" />
        <StatsCard title={t("dashboard.received")} value={`${stats.cashReceived + stats.instapayReceived} ${t("common.egp")}`} subtitle={`Cash ${stats.cashReceived} · InstaPay ${stats.instapayReceived}`} icon={Banknote} color="green" />
        <StatsCard title={t("dashboard.unreceived")} value={`${stats.revenue - stats.cashReceived - stats.instapayReceived} ${t("common.egp")}`} icon={CreditCard} color="red" />
      </div>

      <WashRecordsTable
        records={records}
        onFinish={handleFinish}
        onCancel={handleCancel}
        onEdit={setEditingRecord}
        onDelete={handleDelete}
        onTogglePayment={handleTogglePayment}
        onProofUpdate={handleProofUpdate}
        loading={loading}
      />

      <AddCarModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
        workers={workers}
        onAddWorker={handleAddWorker}
      />

      {editingRecord && (
        <EditCarModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={handleEditSuccess}
          record={editingRecord}
          workers={workers}
        />
      )}

      <FinishModal
        isOpen={!!finishingRecord}
        onClose={() => setFinishingRecord(null)}
        onSuccess={handleFinishSuccess}
        record={finishingRecord}
      />

      <CancelModal
        isOpen={!!cancellingRecord}
        onClose={() => setCancellingRecord(null)}
        onSuccess={handleCancelSuccess}
        record={cancellingRecord}
      />

      <DeleteConfirmModal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onSuccess={() => handleDeleteSuccess(deletingRecord!.id)}
        record={deletingRecord}
      />
    </div>
  );
}
