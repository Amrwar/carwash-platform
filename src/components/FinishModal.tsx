"use client";

import { useState } from "react";
import Modal from "./Modal";
import { WashRecord, Worker } from "@prisma/client";
import { Loader2, CheckCircle } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

interface FinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: WashRecordWithWorker) => void;
  record: WashRecordWithWorker | null;
}

export default function FinishModal({ isOpen, onClose, onSuccess, record }: FinishModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    if (!record) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/wash-records/${record.id}/finish`, {
        method: "POST",
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setError(data.error || "Failed to finish record");
      }
    } catch {
      setError("Failed to finish record");
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("finish.title")} size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">{t("finish.confirm")}</p>
              <p className="text-sm text-green-700 mt-1">
                {record.plateNumber} - {record.washType} {t("finish.wash")}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">{t("common.cancel")}</button>
          <button onClick={handleFinish} disabled={loading} className="btn btn-primary flex-1">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("finish.finishing")}</> : t("finish.finish")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
