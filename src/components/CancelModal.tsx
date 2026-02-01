"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { WashRecord, Worker } from "@prisma/client";
import { Loader2, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };
type PaymentType = "CASH" | "INSTAPAY";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: WashRecordWithWorker) => void;
  record: WashRecordWithWorker | null;
}

export default function CancelModal({ isOpen, onClose, onSuccess, record }: CancelModalProps) {
  const { t } = useI18n();

  const paymentTypes: { value: PaymentType; label: string }[] = [
    { value: "CASH", label: t("addCar.cash") },
    { value: "INSTAPAY", label: t("addCar.instapay") },
  ];
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amountPaid: "",
    paymentType: "CASH" as PaymentType | "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record && isOpen) {
      setFormData({
        amountPaid: record.amountPaid > 0 ? record.amountPaid.toString() : "",
        paymentType: record.paymentType || "CASH",
        notes: record.notes || "",
      });
      setErrors({});
    }
  }, [record, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wash-records/${record.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: parseFloat(formData.amountPaid) || 0,
          paymentType: formData.amountPaid && parseFloat(formData.amountPaid) > 0 ? formData.paymentType : null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrors({ submit: data.error || "Failed to cancel record" });
      }
    } catch {
      setErrors({ submit: "Failed to cancel record" });
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("cancel.title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">{t("cancel.markAsLeft")} {record.plateNumber}?</p>
              <p className="text-sm text-amber-700 mt-1">Original: {record.washType} wash ({record.amountPaid} {t("common.egp")})</p>
            </div>
          </div>
        </div>

        <div>
          <label className="label">{t("cancel.amountPaid")}</label>
          <input
            type="number"
            className="input"
            placeholder="0"
            min="0"
            step="0.01"
            value={formData.amountPaid}
            onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">{t("cancel.amountHint")}</p>
        </div>

        {formData.amountPaid && parseFloat(formData.amountPaid) > 0 && (
          <div>
            <label className="label">{t("cancel.paymentType")}</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentType: type.value })}
                  className={`py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
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
        )}

        <div>
          <label className="label">{t("cancel.reason")}</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder={t("cancel.reasonPlaceholder")}
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
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">{t("common.goBack")}</button>
          <button type="submit" disabled={loading} className="btn btn-danger flex-1">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("cancel.processing")}</> : <><XCircle className="w-4 h-4" />{t("cancel.markAsLeft")}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
