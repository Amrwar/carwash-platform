"use client";

import { useState } from "react";
import Modal from "./Modal";
import { WashRecord, Worker } from "@prisma/client";
import { Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: WashRecordWithWorker | null;
}

export default function DeleteConfirmModal({ isOpen, onClose, onSuccess, record }: DeleteConfirmModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!record) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/wash-records/${record.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete record");
      }
    } catch {
      setError("Failed to delete record");
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("deleteRecord.title")} size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">{t("deleteRecord.confirm")}</p>
              <p className="text-sm text-red-700 mt-1">
                {record.plateNumber} - {record.washType} {t("deleteRecord.wash")}
              </p>
              <p className="text-xs text-red-600 mt-2">{t("deleteRecord.undone")}</p>
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
          <button onClick={handleDelete} disabled={loading} className="btn btn-danger flex-1">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("deleteRecord.deleting")}</> : t("common.delete")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
