"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { MechanicRecord } from "@prisma/client";
import { Loader2, Droplets } from "lucide-react";
import { useI18n } from "@/i18n/context";

type OilType = "SHELL_4L" | "SHELL_5L" | "CUSTOMER_OWN";
type ServiceType = "OIL_ONLY" | "OIL_AND_FILTER";
type PaymentType = "CASH" | "INSTAPAY";

interface AddOilServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: MechanicRecord) => void;
}

const OIL_PRICES: Record<OilType, number> = {
  SHELL_4L: 2200,
  SHELL_5L: 2700,
  CUSTOMER_OWN: 0,
};

const LABOR_COSTS: Record<ServiceType, number> = {
  OIL_ONLY: 200,
  OIL_AND_FILTER: 300,
};

export default function AddOilServiceModal({ isOpen, onClose, onSuccess }: AddOilServiceModalProps) {
  const { t } = useI18n();

  const oilTypes: { value: OilType; label: string; price: number; color: string }[] = [
    { value: "SHELL_4L", label: t("oilService.shell4l"), price: 2200, color: "bg-blue-100 text-blue-700 border-blue-300" },
    { value: "SHELL_5L", label: t("oilService.shell5l"), price: 2700, color: "bg-purple-100 text-purple-700 border-purple-300" },
    { value: "CUSTOMER_OWN", label: t("oilService.customerOwn"), price: 0, color: "bg-gray-100 text-gray-700 border-gray-300" },
  ];

  const serviceTypes: { value: ServiceType; label: string; price: number }[] = [
    { value: "OIL_ONLY", label: t("oilService.oilOnly"), price: 200 },
    { value: "OIL_AND_FILTER", label: t("oilService.oilAndFilter"), price: 300 },
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
    oilType: "SHELL_4L" as OilType,
    serviceType: "OIL_AND_FILTER" as ServiceType,
    filterPrice: "350",
    paymentType: "CASH" as PaymentType,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        plateNumber: "",
        carType: "",
        phoneNumber: "",
        oilType: "SHELL_4L",
        serviceType: "OIL_AND_FILTER",
        filterPrice: "350",
        paymentType: "CASH",
        notes: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  const oilPrice = OIL_PRICES[formData.oilType];
  const laborCost = LABOR_COSTS[formData.serviceType];
  const filterPrice = formData.serviceType === "OIL_AND_FILTER" ? parseFloat(formData.filterPrice) || 0 : 0;
  const totalAmount = oilPrice + laborCost + filterPrice;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.plateNumber.trim()) {
      newErrors.plateNumber = t("addCar.plateRequired");
    }
    if (formData.serviceType === "OIL_AND_FILTER") {
      const filter = parseFloat(formData.filterPrice);
      if (isNaN(filter) || filter < 350 || filter > 500) {
        newErrors.filterPrice = t("oilService.filterPriceError");
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
      const response = await fetch("/api/mechanic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formData.plateNumber.trim().toUpperCase(),
          carType: formData.carType.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          category: "OIL_SERVICE",
          oilType: formData.oilType,
          oilPrice,
          serviceType: formData.serviceType,
          laborCost,
          filterPrice,
          totalAmount,
          paymentType: formData.paymentType,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setErrors({ submit: data.error || "Failed to add service" });
      }
    } catch {
      setErrors({ submit: "Failed to add service" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("oilService.title")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t("oilService.plateNumber")} *</label>
            <input
              type="text"
              className="input uppercase"
              placeholder="ABC 1234"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
              autoFocus
            />
            {errors.plateNumber && <p className="text-sm text-red-500 mt-1">{errors.plateNumber}</p>}
          </div>
          <div>
            <label className="label">{t("oilService.carType")}</label>
            <input
              type="text"
              className="input"
              placeholder={t("addCar.carTypePlaceholder")}
              value={formData.carType}
              onChange={(e) => setFormData({ ...formData, carType: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">{t("oilService.oilType")} *</label>
          <div className="grid grid-cols-3 gap-2">
            {oilTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, oilType: type.value })}
                className={`py-3 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.oilType === type.value
                    ? type.color + " border-current"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="block">{type.label}</span>
                <span className="block text-xs opacity-75 mt-1">
                  {type.price > 0 ? `${type.price} ${t("common.egp")}` : t("oilService.noCharge")}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">{t("oilService.serviceType")} *</label>
          <div className="grid grid-cols-2 gap-2">
            {serviceTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, serviceType: type.value })}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.serviceType === type.value
                    ? "bg-red-50 text-red-700 border-red-300"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="block">{type.label}</span>
                <span className="block text-xs opacity-75 mt-1">{type.price} {t("oilService.laborEgp")}</span>
              </button>
            ))}
          </div>
        </div>

        {formData.serviceType === "OIL_AND_FILTER" && (
          <div>
            <label className="label">{t("oilService.filterPrice")} *</label>
            <input
              type="number"
              className="input"
              placeholder="350"
              min="350"
              max="500"
              value={formData.filterPrice}
              onChange={(e) => setFormData({ ...formData, filterPrice: e.target.value })}
            />
            {errors.filterPrice && <p className="text-sm text-red-500 mt-1">{errors.filterPrice}</p>}
          </div>
        )}

        <div>
          <label className="label">{t("oilService.paymentType")} *</label>
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

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">{t("oilService.oil")} ({oilTypes.find(o => o.value === formData.oilType)?.label})</span>
            <span className="font-medium">{oilPrice} {t("common.egp")}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">{t("oilService.labor")} ({formData.serviceType === "OIL_ONLY" ? t("oilService.oilOnlyLabel") : t("oilService.oilFilterLabel")})</span>
            <span className="font-medium">{laborCost} {t("common.egp")}</span>
          </div>
          {formData.serviceType === "OIL_AND_FILTER" && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">{t("oilService.oilFilter")}</span>
              <span className="font-medium">{filterPrice} {t("common.egp")}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-300">
            <span className="font-semibold text-gray-900">{t("common.total")}</span>
            <span className="font-bold text-lg text-red-600">{totalAmount} {t("common.egp")}</span>
          </div>
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
                {t("oilService.adding")}
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4" />
                {t("oilService.addService")}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
