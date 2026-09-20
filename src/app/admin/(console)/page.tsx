"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  Clock,
  Music,
  Building2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppConfig, useActiveEvent, useDepartments } from "@/hooks/useData";
import { updateAppConfig } from "@/lib/admin/settings";
import { getStudentStats } from "@/lib/admin/students";
import { getPerformances } from "@/lib/admin/performances";
import { getCategories } from "@/lib/admin/categories";
import { query, where, getCountFromServer } from "firebase/firestore";
import { usersRef } from "@/lib/firebase/paths";
import { OFFICIAL_DEPARTMENTS_LIST } from "@/config/departments";

export default function AdminOverviewPage() {
  const { config, loading: configLoading } = useAppConfig();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments, loading: deptsLoading } = useDepartments();

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{
    registered: number;
    verified: number;
    unverified: number;
    performanceCount: number;
    departmentCounts: Record<string, number>;
  }>({
    registered: 0,
    verified: 0,
    unverified: 0,
    performanceCount: 0,
    departmentCounts: {},
  });

  const [categoryCount, setCategoryCount] = useState(0);
  const [updatingRegistration, setUpdatingRegistration] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const studentStatsPromise = getStudentStats();
      const perfsPromise = config?.activeEventId
        ? getPerformances(config.activeEventId)
        : Promise.resolve([]);
      const catsPromise = getCategories();

      const [sStats, perfs, cats] = await Promise.all([
        studentStatsPromise,
        perfsPromise,
        catsPromise,
      ]);

      setCategoryCount(cats.length);

      // Fetch per-department counts via aggregation query
      const deptCountMap: Record<string, number> = {};
      await Promise.all([
        ...OFFICIAL_DEPARTMENTS_LIST.map(async (d) => {
          const q = query(usersRef(), where("departmentCode", "==", d.code));
          const snap = await getCountFromServer(q);
          deptCountMap[d.code] = snap.data().count;
        }),
        ...departments.map(async (d) => {
          const q = query(usersRef(), where("departmentId", "==", d.id));
          const snap = await getCountFromServer(q);
          deptCountMap[d.id] = (deptCountMap[d.id] ?? 0) + snap.data().count;
        }),
      ]);

      setStats({
        registered: sStats.total,
        verified: sStats.verified,
        unverified: sStats.unverified,
        performanceCount: perfs.length,
        departmentCounts: deptCountMap,
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to refresh statistics");
    } finally {
      setLoadingStats(false);
    }
  }, [config?.activeEventId, departments]);

  useEffect(() => {
    if (!configLoading && !deptsLoading) {
      fetchStats();
    }
  }, [configLoading, deptsLoading, fetchStats]);

  const handleToggleRegistration = async (open: boolean) => {
    if (!config) return;
    setUpdatingRegistration(true);
    try {
      await updateAppConfig({
        ...config,
        registrationOpen: open,
      });
      toast.success(open ? "Registration opened!" : "Registration closed!");
      // Reload state by triggering re-render/cache update
      window.location.reload();
    } catch (err: unknown) {
      toast.error("Failed to update registration status");
      console.error(err);
    } finally {
      setUpdatingRegistration(false);
    }
  };

  // Checklist items
  const isDomainConfigured =
    config?.allowedEmailDomains &&
    config.allowedEmailDomains.length > 0 &&
    !config.allowedEmailDomains.includes("college.edu"); // college.edu is placeholder

  const hasDepartments = departments.length > 0;
  const hasCategories = categoryCount > 0;
  const hasPerformances = stats.performanceCount > 0;
  const hasActiveEvent = !!config?.activeEventId;
  const isRegistrationOpen = !!config?.registrationOpen;

  const checklist = [
    {
      title: "College email domain configured",
      desc: isDomainConfigured
        ? `Configured (${config?.allowedEmailDomains.join(", ")})`
        : "Replace placeholder domain 'college.edu' with real campus domain",
      passed: isDomainConfigured,
      href: "/admin/settings",
    },
    {
      title: "Active event selected",
      desc: hasActiveEvent
        ? `Event: ${event?.name ?? config?.activeEventId}`
        : "Select an active event",
      passed: hasActiveEvent,
      href: "/admin/settings",
    },
    {
      title: "Departments created",
      desc: hasDepartments ? `${departments.length} departments` : "Add participating departments",
      passed: hasDepartments,
      href: "/admin/departments",
    },
    {
      title: "Competition categories created",
      desc: hasCategories ? `${categoryCount} categories` : "Add performance categories",
      passed: hasCategories,
      href: "/admin/categories",
    },
    {
      title: "Performances scheduled",
      desc: hasPerformances
        ? `${stats.performanceCount} performances added`
        : "Add acts and lineup for the festival",
      passed: hasPerformances,
      href: "/admin/performances",
    },
    {
      title: "Student registration open",
      desc: isRegistrationOpen
        ? "Registration is currently OPEN"
        : "Registration is CLOSED",
      passed: isRegistrationOpen,
      href: "/admin/settings",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Overview
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Festival health, registration metrics, and readiness checklist
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loadingStats}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Registration Open/Closed Banner */}
      <Card
        className="border-2"
        style={{
          borderColor: isRegistrationOpen ? "var(--success)" : "var(--border)",
          background: isRegistrationOpen ? "var(--success-soft)" : "var(--surface)",
        }}
      >
        <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: isRegistrationOpen ? "var(--success)" : "var(--surface-alt)",
                color: isRegistrationOpen ? "#ffffff" : "var(--ink-muted)",
              }}
            >
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                  Student Registration is {isRegistrationOpen ? "OPEN" : "CLOSED"}
                </h3>
                <Badge variant={isRegistrationOpen ? "default" : "outline"}>
                  {isRegistrationOpen ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {isRegistrationOpen
                  ? "Students from approved college domains can sign up and verify."
                  : "Registration form shows a friendly closed notice. Rules block all profile writes."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {isRegistrationOpen ? "Open" : "Closed"}
            </span>
            <Switch
              checked={isRegistrationOpen}
              onCheckedChange={handleToggleRegistration}
              disabled={updatingRegistration || configLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Total Registered
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: "var(--primary)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                {stats.registered}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Students created accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Verified Students
            </CardTitle>
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--success)" }}>
                {stats.verified}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Eligible to vote on event day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Unverified
            </CardTitle>
            <Clock className="h-4 w-4" style={{ color: "var(--warning)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--warning)" }}>
                {stats.unverified}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Awaiting email verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Lineup Acts
            </CardTitle>
            <Music className="h-4 w-4" style={{ color: "var(--secondary)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--secondary)" }}>
                {stats.performanceCount}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              In event: {event?.name ?? "None"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Readiness Checklist & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" style={{ color: "var(--primary)" }} />
              Event Readiness Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-xl p-3 border"
                style={{
                  background: item.passed ? "var(--surface)" : "var(--surface-alt)",
                  borderColor: item.passed ? "var(--border)" : "var(--warning)",
                }}
              >
                <div className="flex items-start gap-3">
                  {item.passed ? (
                    <CheckCircle2
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: "var(--success)" }}
                    />
                  ) : (
                    <AlertCircle
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: "var(--warning)" }}
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
                <Link href={item.href}>
                  <Button variant="ghost" size="sm" className="h-8 text-xs flex items-center gap-1">
                    Manage <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Per-Department registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" style={{ color: "var(--primary)" }} />
              Registrations by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {OFFICIAL_DEPARTMENTS_LIST.map((d) => {
                  const count =
                    (stats.departmentCounts[d.code] ?? 0) +
                    (stats.departmentCounts[`dept-${d.shortCode.toLowerCase()}`] ?? 0);
                  return (
                    <div
                      key={d.code}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: d.color }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {d.name}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {d.shortCode}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-md bg-slate-50 border text-slate-800">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
