"use client";

import { useState, useRef } from "react";
import { WashRecord, Worker } from "@prisma/client";
import { Search, Clock, CheckCircle, Edit2, Trash2, Loader2, Check, DollarSign, MessageCircle, ChevronLeft, ChevronRight, XCircle, Camera, Image } from "lucide-react";
import clsx from "clsx";
import ImageProofModal from "./ImageProofModal";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

interface WashRecordsTableProps {
  records: WashRecordWithWorker[];
  onFinish: (id: string, phoneNumber?: string | null) => void;
  onCancel: (record: WashRecordWithWorker) => void;
  onEdit: (record: WashRecordWithWorker) => void;
  onDelete: (id: string) => void;
  onTogglePayment: (id: string, received: boolean) => void;
  onProofUpdate: (record: WashRecordWithWorker) => void;
  loading?: boolean;
}

const washTypeColors: Record<string, string> = {
  INNER: "badge-blue",
  OUTER: "badge-green",
  FULL: "badge-purple",
  FREE: "badge-gray",
};

const statusColors: Record<string, string> = {
  IN_PROGRESS: "badge-yellow",
  FINISHED: "badge-green",
  CANCELLED: "badge-red",
};

const ITEMS_PER_PAGE = 10;

export default function WashRecordsTable({
  records,
  onFinish,
  onCancel,
  onEdit,
  onDelete,
  onTogglePayment,
  onProofUpdate,
  loading,
}: WashRecordsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<{ url: string; plateNumber: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (record.carType && record.carType.toLowerCase().includes(search.toLowerCase())) ||
      (record.phoneNumber && record.phoneNumber.includes(search));
    const matchesStatus = statusFilter === "ALL" || record.status === statusFilter;
    const matchesType = typeFilter === "ALL" || record.washType === typeFilter;
    const matchesPayment =
      paymentFilter === "ALL" ||
      (paymentFilter === "RECEIVED" && record.paymentReceived) ||
      (paymentFilter === "PENDING" && !record.paymentReceived);
    return matchesSearch && matchesStatus && matchesType && matchesPayment;
  });

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const handleTogglePayment = async (id: string, currentStatus: boolean) => {
    setTogglingPayment(id);
    await onTogglePayment(id, !currentStatus);
    setTogglingPayment(null);
  };

  const handleCameraClick = (recordId: string) => {
    setSelectedRecordId(recordId);
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecordId) return;

    setUploadingProof(selectedRecordId);
    const recordId = selectedRecordId;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch(`/api/wash-records/${recordId}/proof`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instapayProof: base64 }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onProofUpdate(data.data);
          }
        }
        setUploadingProof(null);
        setSelectedRecordId(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload proof:", error);
      setUploadingProof(null);
      setSelectedRecordId(null);
    }

    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500">{t("table.loadingRecords")}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

      <div className="p-4 border-b border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("table.searchPlaceholder")}
              className="input ps-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            <select className="select" value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}>
              <option value="ALL">{t("table.allStatus")}</option>
              <option value="IN_PROGRESS">{t("table.inProgress")}</option>
              <option value="FINISHED">{t("table.finished")}</option>
              <option value="CANCELLED">{t("table.leftCancelled")}</option>
            </select>
            <select className="select" value={typeFilter} onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}>
              <option value="ALL">{t("table.allTypes")}</option>
              <option value="INNER">{t("table.inner")}</option>
              <option value="OUTER">{t("table.outer")}</option>
              <option value="FULL">{t("table.full")}</option>
              <option value="FREE">{t("table.free")}</option>
            </select>
            <select className="select" value={paymentFilter} onChange={(e) => handleFilterChange(setPaymentFilter, e.target.value)}>
              <option value="ALL">{t("table.allPayments")}</option>
              <option value="RECEIVED">{t("table.receivedFilter")}</option>
              <option value="PENDING">{t("table.pending")}</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">{t("table.noRecords")}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("table.plate")}</th>
                  <th>{t("table.carType")}</th>
                  <th>{t("table.phone")}</th>
                  <th>{t("table.type")}</th>
                  <th>{t("table.worker")}</th>
                  <th>{t("table.time")}</th>
                  <th>{t("table.payment")}</th>
                  <th>{t("table.amount")}</th>
                  <th className="text-center">{t("table.proof")}</th>
                  <th className="text-center">{t("table.received")}</th>
                  <th>{t("table.status")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className={clsx("animate-fade-in", record.status === "CANCELLED" && "bg-red-50")}>
                    <td className="font-medium text-gray-900">
                      <span className="flex items-center gap-2">
                        {record.status === "CANCELLED" && <span title={t("table.left")}><XCircle className="w-4 h-4 text-red-500" /></span>}
                        {record.plateNumber}
                      </span>
                    </td>
                    <td className="text-gray-600">{record.carType || "-"}</td>
                    <td className="text-gray-600">
                      {record.phoneNumber ? (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          {record.phoneNumber}
                        </span>
                      ) : "-"}
                    </td>
                    <td><span className={`badge ${washTypeColors[record.washType]}`}>{record.washType}</span></td>
                    <td className="text-gray-600">{record.worker?.name || "-"}</td>
                    <td className="text-gray-600">{formatTime(record.entryTime)}</td>
                    <td>
                      {record.paymentType ? (
                        <span className={`badge ${record.paymentType === "CASH" ? "badge-green" : "badge-blue"}`}>{record.paymentType}</span>
                      ) : "-"}
                    </td>
                    <td className="text-gray-900">
                      {record.amountPaid > 0 ? `${record.amountPaid} ${t("common.egp")}` : "-"}
                      {record.tipAmount > 0 && <span className="text-green-600 text-xs ms-1">(+{record.tipAmount})</span>}
                    </td>
                    <td className="text-center">
                      {record.paymentType === "INSTAPAY" && (
                        <>
                          {record.instapayProof ? (
                            <button
                              onClick={() => setViewingProof({ url: record.instapayProof!, plateNumber: record.plateNumber })}
                              className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center mx-auto"
                              title={t("table.viewProof")}
                            >
                              <Image className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCameraClick(record.id)}
                              disabled={uploadingProof === record.id}
                              className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 flex items-center justify-center mx-auto"
                              title={t("table.takePhoto")}
                            >
                              {uploadingProof === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td className="text-center">
                      {record.washType !== "FREE" && record.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleTogglePayment(record.id, record.paymentReceived)}
                          disabled={togglingPayment === record.id}
                          className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            record.paymentReceived ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          )}
                          title={record.paymentReceived ? t("table.paymentReceived") : t("table.markReceived")}
                        >
                          {togglingPayment === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : record.paymentReceived ? <Check className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                    <td><span className={`badge ${statusColors[record.status]}`}>{record.status === "IN_PROGRESS" ? t("table.inProgress") : record.status === "FINISHED" ? t("table.finished") : t("table.left")}</span></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {record.status === "IN_PROGRESS" && (
                          <>
                            <button onClick={() => onFinish(record.id, record.phoneNumber)} className="btn btn-sm btn-ghost text-green-600 hover:bg-green-50" title={t("finish.finish")}>
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => onCancel(record)} className="btn btn-sm btn-ghost text-amber-600 hover:bg-amber-50" title={t("table.markAsLeft")}>
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => onEdit(record)} className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-50" title={t("editCar.title")}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(record.id)} className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50" title={t("common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                {t("common.showing")} {startIndex + 1} {t("common.to")} {Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)} {t("common.of")} {filteredRecords.length} {t("common.records")}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx("w-8 h-8 rounded-lg text-sm font-medium", currentPage === page ? "bg-red-600 text-white" : "hover:bg-gray-100 text-gray-600")}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {viewingProof && (
        <ImageProofModal isOpen={!!viewingProof} onClose={() => setViewingProof(null)} imageUrl={viewingProof.url} plateNumber={viewingProof.plateNumber} />
      )}
    </div>
  );
}
