"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { WashRecord, Worker } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };
type WashType = "INNER" | "OUTER" | "FREE" | "FULL";
type PaymentType = "CASH" | "INSTAPAY";

interface EditCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: WashRecordWithWorker) => void;
  record: WashRecordWithWorker;
  workers: Worker[];
}

export default function EditCarModal({ isOpen, onClose, onSuccess, record, workers }: EditCarModalProps) {
  const { t } = useI18n();

  const washTypes: { value: WashType; label: string; color: string }[] = [
    { value: "INNER", label: t("addCar.inner"), color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "OUTER", label: t("addCar.outer"), color: "bg-green-100 text-green-700 border-green-300" },
    { value: "FULL", label: t("addCar.full"), color: "bg-purple-100 text-purple-700 border-purple-300" },
    { value: "FREE", label: t("addCar.free"), color: "bg-gray-100 text-gray-700 border-gray-300" },
  ];

  const paymentTypes: { value: PaymentType; label: string }[] = [
    { value: "CASH", label: t("addCar.cash") },
    { value: "INSTAPAY", label: t("addCar.instapay") },
  ];
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: "",
    carType: "",
    phoneNumber: "",
    washType: "OUTER" as WashType,
    workerId: "",
    paymentType: "" as PaymentType | "",
    amountPaid: "",
    tipAmount: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record && isOpen) {
      setFormData({
        plateNumber: record.plateNumber,
        carType: record.carType || "",
        phoneNumber: record.phoneNumber || "",
        washType: record.washType as WashType,
        workerId: record.workerId || "",
        paymentType: (record.paymentType as PaymentType) || "",
        amountPaid: record.amountPaid.toString(),
        tipAmount: record.tipAmount.toString(),
        notes: record.notes || "",
      });
      setErrors({});
    }
  }, [record, isOpen]);

  const isFreeWash = formData.washType === "FREE";
  const isInstaPay = formData.paymentType === "INSTAPAY";

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.plateNumber.trim()) {
      newErrors.plateNumber = t("addCar.plateRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wash-records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formData.plateNumber.trim().toUpperCase(),
          carType: formData.carType.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          washType: formData.washType,
          workerId: formData.workerId || null,
          paymentType: isFreeWash ? null : formData.paymentType || null,
          amountPaid: isFreeWash ? 0 : parseFloat(formData.amountPaid) || 0,
          tipAmount: isInstaPay ? parseFloat(formData.tipAmount) || 0 : 0,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrors({ submit: data.error || "Failed to update record" });
      }
    } catch {
      setErrors({ submit: "Failed to update record" });
    } finally {
      setLoading(false);
    }
  };

  const activeWorkers = workers.filter((w) => w.isActive);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("editCar.title")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("editCar.plateNumber")} *</label>
            <input
              type="text"
              className="input uppercase"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
            />
            {errors.plateNumber && <p className="text-sm text-red-500 mt-1">{errors.plateNumber}</p>}
          </div>
          <div>
            <label className="label">{t("editCar.carType")}</label>
            <input
              type="text"
              className="input"
              value={formData.carType}
              onChange={(e) => setFormData({ ...formData, carType: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">{t("editCar.phone")}</label>
          <input
            type="tel"
            className="input"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/[^0-9]/g, "") })}
          />
        </div>

        <div>
          <label className="label">{t("editCar.washType")}</label>
          <div className="grid grid-cols-4 gap-2">
            {washTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, washType: type.value })}
                className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.washType === type.value
                    ? type.color + " border-current"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">{t("editCar.worker")}</label>
          <select
            className="select"
            value={formData.workerId}
            onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
          >
            <option value="">{t("editCar.selectWorker")}</option>
            {activeWorkers.map((worker) => (
              <option key={worker.id} value={worker.id}>{worker.name}</option>
            ))}
          </select>
        </div>

        {!isFreeWash && (
          <>
            <div>
              <label className="label">{t("editCar.paymentType")}</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: type.value })}
                    className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.paymentType === type.value
                        ? "bg-primary-50 text-primary-700 border-primary-300"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={isInstaPay ? "grid grid-cols-2 gap-4" : ""}>
              <div>
                <label className="label">{t("editCar.amount")}</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                />
              </div>
              {isInstaPay && (
                <div>
                  <label className="label">{t("editCar.tip")}</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.01"
                    value={formData.tipAmount}
                    onChange={(e) => setFormData({ ...formData, tipAmount: e.target.value })}
                  />
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <label className="label">{t("common.notes")}</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">{t("common.cancel")}</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("editCar.saving")}</> : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
