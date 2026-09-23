"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Shield,
  Check,
  AlertTriangle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAppConfig } from "@/hooks/useData";
import { updateAppConfig, updateEventGate } from "@/lib/admin/settings";
import { checkEmailEligibility } from "@/lib/auth/eligibility";
import { normalizeStudentId } from "@/lib/utils";
import { auth } from "@/lib/firebase/client";
import { adminDirectoryRef } from "@/lib/firebase/paths";
import { getDocs } from "firebase/firestore";
import type { AdminDirectoryEntry } from "@/types/firestore";

type AdminDirWithId = AdminDirectoryEntry & { id: string };

export default function SettingsPage() {
  const { config, loading: configLoading } = useAppConfig();

  // 1. Festival Tab state
  const [festName, setFestName] = useState("");
  const [savingFestival, setSavingFestival] = useState(false);

  // 2. Registration Tab state
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [blockPlusAddressing, setBlockPlusAddressing] = useState(true);
  const [requireStudentId, setRequireStudentId] = useState(false);
  const [studentIdPattern, setStudentIdPattern] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [savingEventOpen, setSavingEventOpen] = useState(false);
  const [sections, setSections] = useState<string[]>(["A", "B"]);
  const [newSectionInput, setNewSectionInput] = useState("");
  const [savingReg, setSavingReg] = useState(false);

  // Email test tool
  const [testEmailInput, setTestEmailInput] = useState("");
  const [testSidInput, setTestSidInput] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  // 3. Admins Tab state
  const [admins, setAdmins] = useState<AdminDirWithId[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [grantEmailInput, setGrantEmailInput] = useState("");
  const [granting, setGranting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminDirWithId | null>(null);

  // 4. Dev Sample Data
  const [loadingSample, setLoadingSample] = useState(false);

  // Sync state with loaded config
  useEffect(() => {
    if (config) {
      setFestName(config.festName);
      setAllowedDomains(config.allowedEmailDomains || []);
      setBlockPlusAddressing(config.blockPlusAddressing);
      setRequireStudentId(config.requireStudentId);
      setStudentIdPattern(config.studentIdPattern || "");
      setRegistrationOpen(config.registrationOpen ?? true);
      setEventOpen(config.eventOpen ?? false);
      setSections(config.sections && config.sections.length > 0 ? config.sections : ["A", "B"]);
    }
  }, [config]);

  // Load admins
  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const snap = await getDocs(adminDirectoryRef());
      setAdmins(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ── 1. Save Festival Name ──
  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !festName.trim()) return;
    setSavingFestival(true);
    try {
      await updateAppConfig({
        ...config,
        festName: festName.trim(),
      });
      toast.success("Festival name updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update festival name");
    } finally {
      setSavingFestival(false);
    }
  };

  // ── 2. Registration Settings ──
  const handleAddDomain = () => {
    const domain = newDomainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return;
    if (allowedDomains.includes(domain)) {
      toast.error("Domain already in list");
      return;
    }
    if (allowedDomains.length >= 10) {
      toast.error("Maximum 10 allowed domains supported");
      return;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      toast.error("Enter a valid hostname like college.edu");
      return;
    }
    setAllowedDomains([...allowedDomains, domain]);
    setNewDomainInput("");
  };

  const handleRemoveDomain = (dom: string) => {
    if (allowedDomains.length <= 1) {
      toast.error("At least one allowed domain is required");
      return;
    }
    setAllowedDomains(allowedDomains.filter((d) => d !== dom));
  };

  const handleAddSection = () => {
    const val = newSectionInput.trim().toUpperCase();
    if (!val) return;
    if (!/^[A-Z0-9]{1,4}$/.test(val)) {
      toast.error("Section code should be 1-4 alphanumeric characters (e.g. A, B, C)");
      return;
    }
    if (sections.includes(val)) {
      toast.error(`Section ${val} already exists`);
      return;
    }
    setSections([...sections, val]);
    setNewSectionInput("");
  };

  const handleRemoveSection = (sec: string) => {
    if (sections.length <= 1) {
      toast.error("At least one active section is required");
      return;
    }
    setSections(sections.filter((s) => s !== sec));
  };

  const handleSaveRegistrationSettings = async () => {
    if (!config) return;
    if (allowedDomains.length === 0) {
      toast.error("At least one allowed domain is required");
      return;
    }
    if (sections.length === 0) {
      toast.error("At least one section is required");
      return;
    }
    setSavingReg(true);
    try {
      await updateAppConfig({
        ...config,
        allowedEmailDomains: allowedDomains,
        blockPlusAddressing,
        requireStudentId,
        studentIdPattern: studentIdPattern.trim() || null,
        registrationOpen,
        eventOpen,
        sections,
      });
      toast.success("Registration rules updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update registration settings");
    } finally {
      setSavingReg(false);
    }
  };

  /** Immediately persists the event open/closed gate to Firestore via server API */
  const handleToggleEventOpen = async (open: boolean) => {
    setEventOpen(open);
    setSavingEventOpen(true);
    try {
      await updateEventGate(open);
      toast.success(
        open
          ? "🟢 System OPEN — students can now access the voting dashboard"
          : "🔴 System CLOSED — students see the Coming Soon screen"
      );
    } catch (err) {
      console.error(err);
      setEventOpen(!open); // revert on failure
      toast.error("Failed to update event gate");
    } finally {
      setSavingEventOpen(false);
    }
  };

  const handleTestEligibility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailInput.trim()) {
      setTestResult(null);
      return;
    }
    const tempConfig = {
      allowedEmailDomains: allowedDomains,
      blockPlusAddressing,
      requireStudentId,
      studentIdPattern: studentIdPattern.trim() || null,
    };
    const res = checkEmailEligibility(testEmailInput.trim(), tempConfig);
    if (!res.ok) {
      setTestResult({ ok: false, reason: res.reason });
      return;
    }

    if (requireStudentId) {
      const normalized = normalizeStudentId(testSidInput.trim());
      if (!normalized) {
        setTestResult({ ok: false, reason: "Student ID is required by current rule configuration." });
        return;
      }
      if (!/^[A-Z0-9-]{3,30}$/.test(normalized)) {
        setTestResult({ ok: false, reason: "Student ID does not match standard 3–30 char pattern [A-Z0-9-]." });
        return;
      }
    }

    setTestResult({ ok: true });
  };

  // ── 3. Admins Grant / Revoke ──
  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmailInput.trim()) return;
    setGranting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: grantEmailInput.trim(),
          action: "grant",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant admin");

      toast.success(`Admin access granted to ${grantEmailInput}`);
      setGrantEmailInput("");
      fetchAdmins();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to grant admin");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!revokeTarget) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: revokeTarget.email,
          action: "revoke",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke admin");

      toast.success(`Admin access revoked for ${revokeTarget.email}`);
      setRevokeTarget(null);
      fetchAdmins();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to revoke admin");
    }
  };

  // ── 6. Dev Sample Data Loader ──
  const isDevEmulator = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
  const handleLoadSampleData = async () => {
    setLoadingSample(true);
    try {
      // In dev emulator, notify user to run npm run seed:emulator in terminal
      toast.info("To load rich sample data with seeded users, run: npm run seed:emulator");
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          Festival Settings & Configuration
        </h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Global fest branding, campus email rules, and administrative access
        </p>
      </div>

      <Tabs defaultValue="festival" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto">
          <TabsTrigger value="festival" className="text-xs sm:text-sm">Festival Info</TabsTrigger>
          <TabsTrigger value="registration" className="text-xs sm:text-sm">Registration & Domains</TabsTrigger>
          <TabsTrigger value="admins" className="text-xs sm:text-sm">Admin Access</TabsTrigger>
        </TabsList>

        {/* ── 1. FESTIVAL INFO TAB ── */}
        <TabsContent value="festival">
          <Card>
            <CardHeader>
              <CardTitle>Festival Branding</CardTitle>
              <CardDescription>
                Public-facing title used across landing pages, student navigation, and emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFestival} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="fest-name">Festival Name *</Label>
                  <Input
                    id="fest-name"
                    value={festName}
                    onChange={(e) => setFestName(e.target.value)}
                    placeholder="e.g. Euphoria 2026"
                    required
                  />
                </div>
                <Button type="submit" disabled={savingFestival || configLoading}>
                  {savingFestival ? "Saving…" : "Save Festival Name"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. REGISTRATION & DOMAINS TAB ── */}
        <TabsContent value="registration" className="space-y-6">
          {/* ─── EVENT DAY GATE (most prominent, top of tab) ─── */}
          <Card className={`border-2 ${eventOpen ? "border-emerald-400 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className={`text-2xl`}>{eventOpen ? "🟢" : "🔴"}</span>
                    Event Day System Gate
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {eventOpen
                      ? "System is OPEN — students can access the voting dashboard right now."
                      : "System is CLOSED — students see the 'Coming Soon' lock screen. Enable this on the day of the fest."}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    id="event-open"
                    checked={eventOpen}
                    onCheckedChange={handleToggleEventOpen}
                    disabled={savingEventOpen || configLoading}
                    className="scale-125"
                  />
                  <span className={`text-xs font-bold ${eventOpen ? "text-emerald-700" : "text-red-700"}`}>
                    {savingEventOpen ? "Saving…" : eventOpen ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-slate-500">
                ⚠️ This is the master switch for the student portal. Turn it ON only on the day of the festival when you are ready to accept ratings &amp; likes.
                Registration and admin console pages are unaffected by this toggle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campus Email Domains &amp; Constraints</CardTitle>
              <CardDescription>
                Enforced by Firestore Security Rules on every account creation without code redeploys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allowed Domains */}
              <div className="space-y-2">
                <Label>Allowed College Email Domains (Exact Match) *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {allowedDomains.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      @{dom}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(dom)}
                        className="hover:text-red-600 rounded-full p-0.5"
                        title={`Remove @${dom}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    placeholder="e.g. college.edu or students.college.edu"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddDomain}>
                    Add Domain
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Only students with mailboxes on these domains will be permitted to register and submit ratings.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-4 max-w-md border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="block-plus">Block Plus-Addressing (+ aliases)</Label>
                    <p className="text-xs text-slate-500">
                      Disallows <code>student+test@college.edu</code> to prevent duplicate rating accounts.
                    </p>
                  </div>
                  <Switch
                    id="block-plus"
                    checked={blockPlusAddressing}
                    onCheckedChange={setBlockPlusAddressing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="req-sid">Require Student ID</Label>
                    <p className="text-xs text-slate-500">
                      Enforces unique Student ID field during registration via atomic claims.
                    </p>
                  </div>
                  <Switch
                    id="req-sid"
                    checked={requireStudentId}
                    onCheckedChange={setRequireStudentId}
                  />
                </div>

                {/* Registration Window Open/Closed Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reg-open" className="text-sm font-semibold text-slate-900">
                        Registration Window
                      </Label>
                      <Badge
                        variant={registrationOpen ? "default" : "outline"}
                        className={
                          registrationOpen
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white text-[11px]"
                            : "text-slate-500 text-[11px]"
                        }
                      >
                        {registrationOpen ? "Open (Active)" : "Closed (Locked)"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      When closed, new student registrations are disabled. Existing registered students can always log in and submit ratings &amp; likes.
                    </p>
                  </div>
                  <Switch
                    id="reg-open"
                    checked={registrationOpen}
                    onCheckedChange={setRegistrationOpen}
                  />
                </div>

                {/* Section Configuration */}
                <div className="space-y-2 pt-2 border-t">
                  <Label>Configured Sections for Registration Form</Label>
                  <p className="text-xs text-slate-500">
                    Students pick from these sections during registration.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sections.map((sec) => (
                      <span
                        key={sec}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                      >
                        Section {sec}
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(sec)}
                          className="hover:text-red-600 rounded-full p-0.5"
                          title={`Remove Section ${sec}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input
                      placeholder="e.g. D"
                      value={newSectionInput}
                      onChange={(e) => setNewSectionInput(e.target.value)}
                      className="h-8 uppercase text-xs"
                      maxLength={4}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSection();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddSection} className="h-8 text-xs">
                      Add Section
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveRegistrationSettings} disabled={savingReg}>
                {savingReg ? "Saving Rules…" : "Save Registration Rules"}
              </Button>
            </CardContent>
          </Card>

          {/* Test an Email / Student ID Helper */}
          <Card className="border-dashed bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Test an Email / Student ID Against Current Rules
              </CardTitle>
              <CardDescription className="text-xs">
                Check whether a student email or ID would pass rules validation right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTestEligibility} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="test-email" className="text-xs">Email</Label>
                  <Input
                    id="test-email"
                    placeholder="student@college.edu"
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    className="h-8 text-xs w-56"
                  />
                </div>
                {requireStudentId && (
                  <div className="space-y-1">
                    <Label htmlFor="test-sid" className="text-xs">Student ID</Label>
                    <Input
                      id="test-sid"
                      placeholder="STU-2026-001"
                      value={testSidInput}
                      onChange={(e) => setTestSidInput(e.target.value)}
                      className="h-8 text-xs w-36 uppercase"
                    />
                  </div>
                )}
                <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                  Validate Rules
                </Button>
              </form>

              {testResult && (
                <div
                  className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.ok
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.ok ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Eligible!</strong> This account matches all configured domain and alias criteria.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span><strong>Blocked:</strong> {testResult.reason}</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. ADMINS TAB ── */}
        <TabsContent value="admins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authorized Administrators</CardTitle>
              <CardDescription>
                Accounts with Firebase Custom Claim <code>admin: true</code>. Managed via secure backend route.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grant form */}
              <form onSubmit={handleGrantAdmin} className="flex flex-wrap items-end gap-2 max-w-md">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="admin-grant-email">Grant Admin to Verified Account</Label>
                  <Input
                    id="admin-grant-email"
                    type="email"
                    placeholder="admin@msec.edu.in"
                    value={grantEmailInput}
                    onChange={(e) => setGrantEmailInput(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={granting}>
                  {granting ? "Granting…" : "Grant Admin"}
                </Button>
              </form>

              {/* Admins Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin Email</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAdmins ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-500">
                        Loading admin directory…
                      </TableCell>
                    </TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-500">
                        No admin entries in directory.
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((adm) => {
                      const isCurrentUser = adm.email === auth.currentUser?.email;
                      return (
                        <TableRow key={adm.id}>
                          <TableCell className="font-semibold text-slate-900">
                            {adm.email} {isCurrentUser && <Badge variant="secondary" className="ml-2">You</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">
                            {adm.addedBy}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isCurrentUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeTarget(adm)}
                                className="h-8 text-xs text-red-600 hover:text-red-700"
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Revoke confirmation dialog */}
          <ConfirmDialog
            open={!!revokeTarget}
            onOpenChange={(open) => !open && setRevokeTarget(null)}
            title="Revoke Admin Access?"
            description={`Are you sure you want to revoke admin rights for ${revokeTarget?.email}? They will no longer be able to access the admin console.`}
            confirmLabel="Revoke Access"
            destructive
            onConfirm={handleRevokeAdmin}
          />
        </TabsContent>
      </Tabs>

      {/* Dev only: Load sample data helper */}
      {isDevEmulator && (
        <Card className="border-dashed bg-slate-50 mt-8">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 text-slate-700">
              <Database className="h-4 w-4 text-primary" /> Development Emulator Utilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs text-slate-600 flex items-center justify-between">
            <span>
              Emulators active. Run <code>npm run seed:emulator</code> in your terminal to populate departments, categories, acts, admin, and student accounts.
            </span>
            <Button size="sm" variant="outline" onClick={handleLoadSampleData} disabled={loadingSample}>
              Seed Reminder
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
