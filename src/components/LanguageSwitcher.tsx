"use client";

import { useI18n } from "@/i18n/context";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      title={locale === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{locale === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}
