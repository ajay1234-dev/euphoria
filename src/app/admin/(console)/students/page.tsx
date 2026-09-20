"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  RefreshCw,
  GraduationCap,
  Building2,
  Layers,
  Users,
  FilterX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { Badge } from "@/components/ui/badge";
import { useDepartments, useAppConfig } from "@/hooks/useData";
import {
  getDepartmentFromCode,
  OFFICIAL_DEPARTMENTS_LIST,
  YEAR_OPTIONS,
  DEFAULT_SECTIONS,
  formatYearLabel,
} from "@/config/departments";
import {
  getStudentStats,
  getStudentsPage,
  exportStudentsCsv,
  type StudentStats,
  type AdminStudentRecord,
} from "@/lib/admin/students";
import { formatDateTime } from "@/lib/utils";

export default function StudentsPage() {
  const { departments } = useDepartments();
  const { config } = useAppConfig();

  const availableSections = useMemo<string[]>(() => {
    return config?.sections && config.sections.length > 0
      ? config.sections
      : [...DEFAULT_SECTIONS];
  }, [config?.sections]);

  // Stats
  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    verified: 0,
    unverified: 0,
    registered: 0,
    pending: 0,
    departmentCounts: {},
    yearCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    sectionCounts: {},
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Table pagination & records
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"all" | "registered" | "pending">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Export state
  const [exporting, setExporting] = useState(false);

  // Load stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getStudentStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch page with filters
  const fetchPage = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const result = await getStudentsPage({
        statusFilter,
        departmentFilter: deptFilter,
        yearFilter,
        sectionFilter,
        searchQuery: appliedSearch,
        page: targetPage,
        pageSize: 25,
      });
      setStudents(result.students);
      setTotalMatches(result.totalMatches);
      setHasMore(result.hasMore);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students directory");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, yearFilter, sectionFilter, appliedSearch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setDeptFilter("all");
    setYearFilter("all");
    setSectionFilter("all");
    setSearchInput("");
    setAppliedSearch("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      toast.info("Generating CSV export…");
      await exportStudentsCsv();
      toast.success("CSV export downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export students CSV");
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    deptFilter !== "all" ||
    yearFilter !== "all" ||
    sectionFilter !== "all" ||
    appliedSearch !== "";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Management
          </h1>
          <p className="text-sm text-slate-500">
            Verified student profiles, department/year distributions, and CSV directory export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchPage(1);
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" /> Total Registered Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tabular-nums text-slate-900">
              {loadingStats ? "…" : stats.total}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All students who completed Google authentication
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active / Eligible Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {loadingStats ? "…" : stats.registered}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1">
              Verified identity eligible for live voting
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tabular-nums text-amber-700">
              {loadingStats ? "…" : stats.pending}
            </div>
            <p className="text-xs text-amber-600/80 mt-1">
              Signed in with Google but not yet confirmed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Year Distribution */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Year Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown across undergraduate academic years
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {YEAR_OPTIONS.map((opt) => {
              const count = stats.yearCounts[opt.value] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={opt.value} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{opt.label}</span>
                    <span className="font-semibold text-slate-900">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Section Distribution */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600" /> Section Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Student distribution across designated sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              {availableSections.map((sec) => {
                const count = stats.sectionCounts[sec.toUpperCase()] || 0;
                return (
                  <div
                    key={sec}
                    className="flex-1 min-w-[70px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-center"
                  >
                    <div className="text-xs text-slate-500 font-medium">Sec {sec}</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{count}</div>
                  </div>
                );
              })}
              {Object.keys(stats.sectionCounts)
                .filter((s) => !availableSections.includes(s))
                .map((sec) => (
                  <div
                    key={sec}
                    className="flex-1 min-w-[70px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-center"
                  >
                    <div className="text-xs text-slate-500 font-medium">Sec {sec}</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      {stats.sectionCounts[sec]}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" /> Department Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Extracted automatically from register numbers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {OFFICIAL_DEPARTMENTS_LIST.map((d) => {
              const count = stats.departmentCounts[d.code] || 0;
              return (
                <div
                  key={d.code}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">
                      {d.shortCode} <span className="text-slate-400 font-mono">({d.code})</span>
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="lg:col-span-2 flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, register no…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs shrink-0">
                Search
              </Button>
            </form>

            {/* Department Filter */}
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {OFFICIAL_DEPARTMENTS_LIST.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.shortCode} ({d.code})
                  </SelectItem>
                ))}
                <SelectItem value="other">Other / Not Listed</SelectItem>
              </SelectContent>
            </Select>

            {/* Year Filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y.value} value={String(y.value)}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Section Filter */}
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    Section {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val: "all" | "registered" | "pending") => setStatusFilter(val)}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="registered">Registered Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Indicators & Reset */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Filtered matches: <strong>{totalMatches}</strong></span>
                {appliedSearch && <span>• Query: &quot;{appliedSearch}&quot;</span>}
                {deptFilter !== "all" && <span>• Dept: {deptFilter}</span>}
                {yearFilter !== "all" && <span>• Year: {formatYearLabel(Number(yearFilter))}</span>}
                {sectionFilter !== "all" && <span>• Sec: {sectionFilter}</span>}
                {statusFilter !== "all" && <span>• Status: {statusFilter}</span>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-primary hover:text-primary-strong flex items-center gap-1"
              >
                <FilterX className="h-3.5 w-3.5" /> Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Records Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Register Number</TableHead>
                <TableHead className="font-semibold text-slate-700">Year</TableHead>
                <TableHead className="font-semibold text-slate-700">Department</TableHead>
                <TableHead className="font-semibold text-slate-700">Section</TableHead>
                <TableHead className="font-semibold text-slate-700">Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-sm text-slate-500">
                    Loading student directory…
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-sm text-slate-500">
                    No students found matching current filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => {
                  const offDept = getDepartmentFromCode(s.departmentCode);
                  return (
                    <TableRow key={s.uid} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Name */}
                      <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                        {s.name}
                      </TableCell>

                      {/* 2. Register Number */}
                      <TableCell className="font-mono text-xs text-slate-900 font-bold">
                        {s.registerNumber}
                      </TableCell>

                      {/* 3. Year */}
                      <TableCell className="text-xs whitespace-nowrap text-slate-700 font-medium">
                        {formatYearLabel(s.year)}
                      </TableCell>

                      {/* 4. Department */}
                      <TableCell>
                        {offDept ? (
                          <div className="flex items-center gap-1.5">
                            <DepartmentChip
                              name={offDept.name}
                              shortName={offDept.shortCode}
                              color={offDept.color}
                            />
                            <span className="font-mono text-[11px] text-slate-400">
                              ({s.departmentCode})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            {s.department || "Other"}
                          </span>
                        )}
                      </TableCell>

                      {/* 5. Section */}
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-xs bg-slate-50">
                          Sec {s.section}
                        </Badge>
                      </TableCell>

                      {/* 6. Email */}
                      <TableCell className="font-mono text-xs text-slate-600">
                        {s.email}
                      </TableCell>

                      {/* 7. Status */}
                      <TableCell>
                        {s.registrationStatus === "registered" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
                          </span>
                        )}
                      </TableCell>

                      {/* 8. Registered At */}
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {s.registeredAt ? formatDateTime(s.registeredAt) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination bar */}
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <strong>
                {totalMatches > 0 ? (page - 1) * 25 + 1 : 0} –{" "}
                {Math.min(page * 25, totalMatches)}
              </strong>{" "}
              of <strong>{totalMatches}</strong> students
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || loading}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-slate-700 px-2">
                Page {page} of {Math.max(1, Math.ceil(totalMatches / 25))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPage(page + 1)}
                disabled={!hasMore || loading}
                className="text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
