'use client';
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { Car, Wrench, BarChart3, Users, ArrowRight } from "lucide-react";

const quickAccessCards = [
  {
    href: "/dashboard",
    icon: Car,
    title: "Dashboard",
    description: "View and manage today's wash records, stats, and exports.",
    color: "bg-red-50 text-red-600",
  },
  {
    href: "/mechanic",
    icon: Wrench,
    title: "Mechanic",
    description: "Track mechanic jobs and service requests.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    href: "/reports",
    icon: BarChart3,
    title: "Reports",
    description: "View revenue reports and business analytics.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/worker-stats",
    icon: Users,
    title: "Workers",
    description: "Monitor worker performance and assignments.",
    color: "bg-green-50 text-green-600",
  },
];

export default function HomePage() {
  const { t } = useI18n();
  const quickAccessCards = [
    {
      href: "/dashboard",
      icon: Car,
      title: t("nav.dashboard"),
      description: t("home.dashboardDesc"),
      color: "bg-red-50 text-red-600",
    },
    {
      href: "/mechanic",
      icon: Wrench,
      title: t("nav.mechanic"),
      description: t("home.mechanicDesc"),
      color: "bg-orange-50 text-orange-600",
    },
    {
      href: "/reports",
      icon: BarChart3,
      title: t("nav.reports"),
      description: t("home.reportsDesc"),
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: "/worker-stats",
      icon: Users,
      title: t("nav.workers"),
      description: t("home.workersDesc"),
      color: "bg-green-50 text-green-600",
    },
  ];
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="text-red-600">VRoom</span>{" "}
          <span className="text-gray-900">CarWash</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-gray-500 max-w-md">
          {t("home.subtitle")}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-white font-semibold hover:bg-red-700 transition-colors"
        >
          {t("home.goToDashboard")}
          <ArrowRight className="w-5 h-5 rtl:rotate-180" />
        </Link>
      </section>

      {/* Quick-access cards */}
      <section className="max-w-5xl w-full mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex rounded-lg p-3 ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
