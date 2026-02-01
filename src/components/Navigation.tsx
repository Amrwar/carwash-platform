"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, BarChart3, Users, LogOut, Wrench } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "./LanguageSwitcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Car },
  { href: "/mechanic", label: "Mechanic", icon: Wrench },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/worker-stats", label: "Workers", icon: Users },
];

export default function Navigation() {
  const { t } = useI18n();

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: Car },
    { href: "/mechanic", label: t("nav.mechanic"), icon: Wrench },
    { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
    { href: "/worker-stats", label: t("nav.workers"), icon: Users },
  ];

  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (pathname === "/" || pathname === "/login") return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-red-600">VRoom</span>
              <span className="text-xl font-semibold text-gray-900">CarWash</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-50 text-red-600"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-gray-100">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                isActive ? "text-red-600" : "text-gray-600"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
