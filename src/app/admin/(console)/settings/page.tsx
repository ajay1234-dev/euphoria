"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Shield,
  Plus,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAppConfig, useActiveEvent } from "@/hooks/useData";
import { updateAppConfig } from "@/lib/admin/settings";
import {
  getEvents,
  createEvent,
  updateEvent,
  duplicateLineup,
  setActiveEvent,
} from "@/lib/admin/events";
import { checkEmailEligibility } from "@/lib/auth/eligibility";
import { normalizeStudentId } from "@/lib/utils";
import { VOTING_DURATION_PRESETS } from "@/config/constants";
import { auth } from "@/lib/firebase/client";
import { adminDirectoryRef } from "@/lib/firebase/paths";
import { getDocs } from "firebase/firestore";
import type { FestEvent, AdminDirectoryEntry } from "@/types/firestore";

type FestEventWithId = FestEvent & { id: string };
type AdminDirWithId = AdminDirectoryEntry & { id: string };

export default function SettingsPage() {
  const { config, loading: configLoading } = useAppConfig();
  const { event: activeEvent } = useActiveEvent(config?.activeEventId);

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
  const [sections, setSections] = useState<string[]>(["A", "B"]);
  const [newSectionInput, setNewSectionInput] = useState("");
  const [savingReg, setSavingReg] = useState(false);

  // Email test tool
  const [testEmailInput, setTestEmailInput] = useState("");
  const [testSidInput, setTestSidInput] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  // 3. Events Tab state
  const [events, setEvents] = useState<FestEventWithId[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventYear, setNewEventYear] = useState(new Date().getFullYear());
  const [newEventIsTest, setNewEventIsTest] = useState(false);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string>("none");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [switchEventTarget, setSwitchEventTarget] = useState<FestEventWithId | null>(null);

  // 4. Voting Defaults Tab state
  const [votingDuration, setVotingDuration] = useState(60);
  const [savingVotingDefaults, setSavingVotingDefaults] = useState(false);

  // 5. Admins Tab state
  const [admins, setAdmins] = useState<AdminDirWithId[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [grantEmailInput, setGrantEmailInput] = useState("");
  const [granting, setGranting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminDirWithId | null>(null);

  // 6. Dev Sample Data
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
      setSections(config.sections && config.sections.length > 0 ? config.sections : ["A", "B"]);
    }
  }, [config]);

  useEffect(() => {
    if (activeEvent) {
      setVotingDuration(activeEvent.defaultVotingDurationSeconds || 60);
    }
  }, [activeEvent]);

  // Load events
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events list");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

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
    fetchEvents();
    fetchAdmins();
  }, [fetchEvents, fetchAdmins]);

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

  // ── 3. Events Management ──
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) {
      toast.error("Please enter an event name");
      return;
    }
    setCreatingEvent(true);
    try {
      const newEventId = await createEvent({
        name: newEventName.trim(),
        year: Number(newEventYear),
        isTest: newEventIsTest,
        status: "setup",
        defaultVotingDurationSeconds: 60,
        resultsLocked: false,
      });

      if (duplicateSourceId && duplicateSourceId !== "none") {
        await duplicateLineup(duplicateSourceId, newEventId);
        toast.success("Event created with duplicated lineup!");
      } else {
        toast.success("Event created successfully!");
      }

      setCreateEventDialogOpen(false);
      setNewEventName("");
      setNewEventIsTest(false);
      setDuplicateSourceId("none");
      fetchEvents();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleConfirmSwitchActive = async () => {
    if (!switchEventTarget) return;
    try {
      await setActiveEvent(switchEventTarget.id);
      toast.success(`Active event switched to: ${switchEventTarget.name}`);
      setSwitchEventTarget(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to change active event");
    }
  };

  // ── 4. Voting Defaults ──
  const handleSaveVotingDefaults = async () => {
    if (!config?.activeEventId) {
      toast.error("No active event selected");
      return;
    }
    if (votingDuration < 10 || votingDuration > 600) {
      toast.error("Duration must be between 10 and 600 seconds");
      return;
    }
    setSavingVotingDefaults(true);
    try {
      await updateEvent(config.activeEventId, {
        defaultVotingDurationSeconds: Number(votingDuration),
      });
      toast.success("Voting duration defaults saved for current event");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save voting defaults");
    } finally {
      setSavingVotingDefaults(false);
    }
  };

  // ── 5. Admins Grant / Revoke ──
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
          Global fest branding, campus email rules, event isolation, and administrative access
        </p>
      </div>

      <Tabs defaultValue="festival" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto">
          <TabsTrigger value="festival" className="text-xs sm:text-sm">Festival Info</TabsTrigger>
          <TabsTrigger value="registration" className="text-xs sm:text-sm">Registration & Domains</TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm">Events & Test Mode</TabsTrigger>
          <TabsTrigger value="voting" className="text-xs sm:text-sm">Voting Defaults</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Campus Email Domains & Constraints</CardTitle>
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
                  Only students with mailboxes on these domains will be permitted to register and vote.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-4 max-w-md border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="block-plus">Block Plus-Addressing (+ aliases)</Label>
                    <p className="text-xs text-slate-500">
                      Disallows <code>student+test@college.edu</code> to prevent duplicate vote accounts.
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
                      When closed, new student registrations are disabled. Existing registered students can always log in and cast votes.
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

        {/* ── 3. EVENTS TAB ── */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Festival Events</CardTitle>
                <CardDescription>
                  Isolated events for rehearsals and live fest day. Test mode events never affect live scores.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateEventDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create Event
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active State</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEvents ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                        Loading events…
                      </TableCell>
                    </TableRow>
                  ) : events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500">
                        No events found. Create one above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((ev) => {
                      const isActive = config?.activeEventId === ev.id;
                      return (
                        <TableRow key={ev.id}>
                          <TableCell className="font-semibold text-slate-900">
                            {ev.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ev.year}</TableCell>
                          <TableCell>
                            <Badge variant={ev.isTest ? "outline" : "default"} className={ev.isTest ? "border-amber-500 text-amber-700 bg-amber-50" : ""}>
                              {ev.isTest ? "TEST MODE" : "LIVE EVENT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-xs text-slate-600">
                            {ev.status}
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Badge variant="default" className="bg-emerald-600">Active (Students See This)</Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Inactive</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSwitchEventTarget(ev)}
                                className="h-7 text-xs"
                              >
                                Set as Active
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

          {/* Create Event Dialog */}
          <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateEvent}>
                <DialogHeader>
                  <DialogTitle>Create New Fest Event</DialogTitle>
                  <DialogDescription>
                    Configure an isolated event run. Lineups can be duplicated from previous events.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-name">Event Name *</Label>
                    <Input
                      id="ev-name"
                      placeholder="e.g. Cultural Fest 2026 (Live Finale)"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-year">Festival Year *</Label>
                    <Input
                      id="ev-year"
                      type="number"
                      min={2000}
                      max={2100}
                      value={newEventYear}
                      onChange={(e) => setNewEventYear(parseInt(e.target.value) || 2026)}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-xl bg-amber-50/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="ev-istest">Test Mode Event</Label>
                      <p className="text-xs text-slate-500">
                        Displays amber TEST banner. Immutable after creation.
                      </p>
                    </div>
                    <Switch
                      id="ev-istest"
                      checked={newEventIsTest}
                      onCheckedChange={setNewEventIsTest}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-dup">Duplicate Lineup From (Optional)</Label>
                    <Select value={duplicateSourceId} onValueChange={setDuplicateSourceId}>
                      <SelectTrigger id="ev-dup">
                        <SelectValue placeholder="Do not duplicate (empty lineup)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Start with blank lineup</SelectItem>
                        {events.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>
                            {ev.name} ({ev.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateEventDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingEvent}>
                    {creatingEvent ? "Creating…" : "Create Event"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Switch active event confirm dialog */}
          <ConfirmDialog
            open={!!switchEventTarget}
            onOpenChange={(open) => !open && setSwitchEventTarget(null)}
            title={
              switchEventTarget?.isTest
                ? "Switch to TEST MODE Event?"
                : "Switch to LIVE Event?"
            }
            description={
              switchEventTarget?.isTest
                ? `You are setting "${switchEventTarget.name}" as the active event. Students will now see the TEST MODE banner.`
                : `WARNING: Students will now see the LIVE event ("${switchEventTarget?.name}"). Make sure testing is completed!`
            }
            confirmLabel="Confirm & Set Active"
            onConfirm={handleConfirmSwitchActive}
          />
        </TabsContent>

        {/* ── 4. VOTING DEFAULTS TAB ── */}
        <TabsContent value="voting">
          <Card>
            <CardHeader>
              <CardTitle>Voting Window Duration</CardTitle>
              <CardDescription>
                Default timer length for voting periods per act in the current event ({activeEvent?.name ?? "No event"})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="space-y-3">
                <Label>Quick Presets (Seconds)</Label>
                <div className="flex gap-2">
                  {VOTING_DURATION_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={votingDuration === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVotingDuration(preset)}
                      className="tabular-nums flex-1"
                    >
                      {preset}s
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-duration">Custom Duration (10 – 600 seconds)</Label>
                <Input
                  id="custom-duration"
                  type="number"
                  min={10}
                  max={600}
                  value={votingDuration}
                  onChange={(e) => setVotingDuration(parseInt(e.target.value) || 60)}
                />
              </div>

              <Button onClick={handleSaveVotingDefaults} disabled={savingVotingDefaults}>
                {savingVotingDefaults ? "Saving…" : "Save Duration Defaults"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 5. ADMINS TAB ── */}
        <TabsContent value="admins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authorized Organizers</CardTitle>
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
                    placeholder="organizer@example.com"
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
