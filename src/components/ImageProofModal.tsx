"use client";

import Modal from "./Modal";
import { useI18n } from "@/i18n/context";

interface ImageProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  plateNumber: string;
}

export default function ImageProofModal({ isOpen, onClose, imageUrl, plateNumber }: ImageProofModalProps) {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t("imageProof.title")} - ${plateNumber}`} size="lg">
      <div className="flex flex-col items-center">
        <img
          src={imageUrl}
          alt="InstaPay Payment Proof"
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
        />
        <button onClick={onClose} className="btn btn-secondary mt-4">
          {t("common.close")}
        </button>
      </div>
    </Modal>
  );
}
