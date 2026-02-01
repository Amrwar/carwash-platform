"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { WashRecord, Worker } from "@prisma/client";
import { Plus, Loader2, Phone, Star, User, Calendar, Award } from "lucide-react";
import { useI18n } from "@/i18n/context";

type WashRecordWithWorker = WashRecord & { worker: Worker | null };
type WashType = "INNER" | "OUTER" | "FREE" | "FULL";
type PaymentType = "CASH" | "INSTAPAY";

interface CustomerInfo {
  plateNumber: string;
  carType: string | null;
  phoneNumber: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  favoriteWashType: string;
  isVIP: boolean;
  recentVisits: Array<{
    washType: string;
    amountPaid: number;
    entryTime: string;
  }>;
}

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: WashRecordWithWorker) => void;
  workers: Worker[];
  onAddWorker: (name: string) => Promise<Worker>;
}

const WASH_PRICES: Record<WashType, number> = {
  INNER: 90,
  OUTER: 90,
  FULL: 170,
  FREE: 0,
};

export default function AddCarModal({ isOpen, onClose, onSuccess, workers, onAddWorker }: AddCarModalProps) {
  const { t, locale } = useI18n();

  const washTypes: { value: WashType; label: string; price: number; color: string }[] = [
    { value: "INNER", label: t("addCar.inner"), price: 90, color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "OUTER", label: t("addCar.outer"), price: 90, color: "bg-green-100 text-green-700 border-green-300" },
    { value: "FULL", label: t("addCar.full"), price: 170, color: "bg-purple-100 text-purple-700 border-purple-300" },
    { value: "FREE", label: t("addCar.free"), price: 0, color: "bg-gray-100 text-gray-700 border-gray-300" },
  ];

  const paymentTypes: { value: PaymentType; label: string }[] = [
    { value: "CASH", label: t("addCar.cash") },
    { value: "INSTAPAY", label: t("addCar.instapay") },
  ];
  const [loading, setLoading] = useState(false);
  const [showNewWorker, setShowNewWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [addingWorker, setAddingWorker] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [formData, setFormData] = useState({
    plateNumber: "",
    carType: "",
    phoneNumber: "",
    washType: "OUTER" as WashType,
    workerId: "",
    paymentType: "CASH" as PaymentType | "",
    amountPaid: "90",
    tipAmount: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchCustomer = useCallback(async (plate: string) => {
    if (plate.length < 2) {
      setCustomerInfo(null);
      return;
    }

    setSearchingCustomer(true);
    try {
      const response = await fetch(`/api/customers/search?plate=${encodeURIComponent(plate)}`);
      const data = await response.json();
      if (data.success && data.data) {
        setCustomerInfo(data.data);
      } else {
        setCustomerInfo(null);
      }
    } catch (error) {
      console.error("Failed to search customer:", error);
      setCustomerInfo(null);
    } finally {
      setSearchingCustomer(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.plateNumber) {
        searchCustomer(formData.plateNumber);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.plateNumber, searchCustomer]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        plateNumber: "",
        carType: "",
        phoneNumber: "",
        washType: "OUTER",
        workerId: "",
        paymentType: "CASH",
        amountPaid: "90",
        tipAmount: "",
        notes: "",
      });
      setErrors({});
      setShowNewWorker(false);
      setNewWorkerName("");
      setCustomerInfo(null);
    }
  }, [isOpen]);

  const handleApplyCustomerInfo = () => {
    if (!customerInfo) return;
    
    setFormData((prev) => ({
      ...prev,
      plateNumber: customerInfo.plateNumber,
      carType: customerInfo.carType || prev.carType,
      phoneNumber: customerInfo.phoneNumber || prev.phoneNumber,
    }));
  };

  const handleWashTypeChange = (washType: WashType) => {
    const price = WASH_PRICES[washType];
    setFormData({
      ...formData,
      washType,
      amountPaid: price.toString(),
      paymentType: washType === "FREE" ? "" : formData.paymentType || "CASH",
      tipAmount: "",
    });
  };

  const handlePaymentTypeChange = (paymentType: PaymentType) => {
    setFormData({
      ...formData,
      paymentType,
      tipAmount: paymentType === "CASH" ? "" : formData.tipAmount,
    });
  };

  const isFreeWash = formData.washType === "FREE";
  const isInstaPay = formData.paymentType === "INSTAPAY";

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.plateNumber.trim()) {
      newErrors.plateNumber = t("addCar.plateRequired");
    }
    if (!isFreeWash) {
      if (!formData.paymentType) {
        newErrors.paymentType = t("addCar.paymentRequired");
      }
      if (!formData.amountPaid || parseFloat(formData.amountPaid) <= 0) {
        newErrors.amountPaid = t("addCar.amountRequired");
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/wash-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formData.plateNumber.trim().toUpperCase(),
          carType: formData.carType.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          washType: formData.washType,
          workerId: formData.workerId || null,
          paymentType: isFreeWash ? null : formData.paymentType,
          amountPaid: isFreeWash ? 0 : parseFloat(formData.amountPaid) || 0,
          tipAmount: isInstaPay ? parseFloat(formData.tipAmount) || 0 : 0,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrors({ submit: data.error || "Failed to add car" });
      }
    } catch {
      setErrors({ submit: "Failed to add car" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) return;
    setAddingWorker(true);
    try {
      const worker = await onAddWorker(newWorkerName.trim());
      setFormData({ ...formData, workerId: worker.id });
      setShowNewWorker(false);
      setNewWorkerName("");
    } catch {
      setErrors({ worker: "Failed to add worker" });
    } finally {
      setAddingWorker(false);
    }
  };

  const activeWorkers = workers.filter((w) => w.isActive);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("addCar.title")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("addCar.plateNumber")} *</label>
            <div className="relative">
              <input
                type="text"
                className="input uppercase"
                placeholder="ABC 1234"
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                autoFocus
              />
              {searchingCustomer && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            {errors.plateNumber && <p className="text-sm text-red-500 mt-1">{errors.plateNumber}</p>}
          </div>
          <div>
            <label className="label">{t("addCar.carType")}</label>
            <input
              type="text"
              className="input"
              placeholder={t("addCar.carTypePlaceholder")}
              value={formData.carType}
              onChange={(e) => setFormData({ ...formData, carType: e.target.value })}
            />
          </div>
        </div>

        {customerInfo && (
          <div className={`p-4 rounded-lg border-2 ${customerInfo.isVIP ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {customerInfo.isVIP ? (
                  <Award className="w-5 h-5 text-amber-500" />
                ) : (
                  <User className="w-5 h-5 text-blue-500" />
                )}
                <span className={`font-semibold ${customerInfo.isVIP ? "text-amber-800" : "text-blue-800"}`}>
                  {customerInfo.isVIP ? t("addCar.vipCustomer") : t("addCar.returningCustomer")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyCustomerInfo}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {t("addCar.autoFill")}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{customerInfo.totalVisits} {t("addCar.visits")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t("addCar.last")}: {formatDate(customerInfo.lastVisit)}</span>
              </div>
              <div className="col-span-2 text-gray-600">
                {t("addCar.totalSpent")}: <span className="font-semibold">{customerInfo.totalSpent} {t("common.egp")}</span>
                {" • "}{t("addCar.favorite")}: <span className="font-semibold">{customerInfo.favoriteWashType}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t("addCar.phone")}
          </label>
          <input
            type="tel"
            className="input"
            placeholder={t("addCar.phonePlaceholder")}
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/[^0-9]/g, "") })}
          />
          <p className="text-xs text-gray-500 mt-1">{t("addCar.phoneHint")}</p>
        </div>

        <div>
          <label className="label">{t("addCar.washType")} *</label>
          <div className="grid grid-cols-4 gap-2">
            {washTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleWashTypeChange(type.value)}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.washType === type.value
                    ? type.color + " border-current"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="block">{type.label}</span>
                <span className="block text-xs opacity-75">
                  {type.price > 0 ? `${type.price} ${t("common.egp")}` : t("addCar.free")}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">{t("addCar.worker")}</label>
          {!showNewWorker ? (
            <div className="flex gap-2">
              <select
                className="select flex-1"
                value={formData.workerId}
                onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
              >
                <option value="">{t("addCar.selectWorker")}</option>
                {activeWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewWorker(true)} className="btn btn-secondary">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder={t("addCar.workerName")}
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddWorker}
                disabled={addingWorker || !newWorkerName.trim()}
                className="btn btn-primary"
              >
                {addingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.add")}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewWorker(false); setNewWorkerName(""); }}
                className="btn btn-ghost"
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
          {errors.worker && <p className="text-sm text-red-500 mt-1">{errors.worker}</p>}
        </div>

        {!isFreeWash && (
          <>
            <div>
              <label className="label">{t("addCar.paymentType")} *</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handlePaymentTypeChange(type.value)}
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
              {errors.paymentType && <p className="text-sm text-red-500 mt-1">{errors.paymentType}</p>}
            </div>

            <div className={isInstaPay ? "grid grid-cols-2 gap-4" : ""}>
              <div>
                <label className="label">{t("addCar.amount")} *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                />
                {errors.amountPaid && <p className="text-sm text-red-500 mt-1">{errors.amountPaid}</p>}
              </div>
              {isInstaPay && (
                <div>
                  <label className="label">{t("addCar.tip")}</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
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

        {isFreeWash && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">{t("addCar.freeWashNote")}</p>
          </div>
        )}

        <div>
          <label className="label">{t("common.notes")}</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder={t("common.notes") + "..."}
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
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("addCar.adding")}
              </>
            ) : (
              t("addCar.addCar")
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
