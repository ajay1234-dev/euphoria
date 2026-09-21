"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig } from "@/hooks/useData";
import {
  validateCollegeIdentity,
  validateStudentRegistrationData,
  extractStudentNameFromIdentity,
  YEAR_OPTIONS,
  DEFAULT_SECTIONS,
  formatYearLabel,
  type OfficialDepartment,
} from "@/config/departments";
import { signInWithGooglePopup, authSignOut } from "@/lib/firebase/auth-google";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  User,
  Calendar,
  Layers,
  Building2,
  Hash,
  Edit3,
} from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";

type RegistrationStep = "auth" | "details" | "confirm" | "success";

interface VerifiedIdentity {
  user: FirebaseUser;
  email: string;
  registerNumber: string;
  departmentCode: string;
  department: OfficialDepartment;
}

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const { status, studentProfile, refreshAuth } = useAuth();
  const router = useRouter();
  const { config, loading: configLoading } = useAppConfig();

  const [step, setStep] = useState<RegistrationStep>("auth");
  const [authenticating, setAuthenticating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Authenticated identity from Google
  const [identity, setIdentity] = useState<VerifiedIdentity | null>(null);

  // Form Fields
  const [studentName, setStudentName] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedSection, setSelectedSection] = useState<string>("");

  // Registered Student Summary for Success Screen
  const [registeredSummary, setRegisteredSummary] = useState<{
    name: string;
    registerNumber: string;
    year: number;
    department: string;
    section: string;
  } | null>(null);

  // If already authenticated and registered, redirect to student dashboard (except when on the success screen)
  useEffect(() => {
    if (status === "loading") return;
    if (step === "success") return; // Keep user on success screen until they click "Continue to Dashboard"
    if (status === "ready" || !!studentProfile) {
      router.replace("/student/dashboard");
    } else if (status === "admin") {
      router.replace("/admin");
    }
  }, [status, studentProfile, step, router]);

  if (status === "loading" || configLoading) return <PageSkeleton />;

  const festName = config?.festName ?? "Euphoria 2026";
  // Registration form sections: Section A and Section B alone
  const availableSections =
    config?.sections && config.sections.length > 0
      ? config.sections.filter((s) => ["A", "B"].includes(s.toUpperCase()))
      : Array.from(DEFAULT_SECTIONS);

  // STEP 1: Google Authentication & Identity Validation
  async function handleGoogleAuth() {
    setErrorMessage(null);
    setAuthenticating(true);

    try {
      const credential = await signInWithGooglePopup();
      const user = credential.user;
      const email = (user.email ?? "").toLowerCase().trim();

      // 1. Check if user is already registered in students/{uid} or users/{uid}
      let alreadyRegistered = false;
      try {
        const [studentDocSnap, userDocSnap] = await Promise.all([
          getDoc(doc(db, "students", user.uid)),
          getDoc(doc(db, "users", user.uid)),
        ]);
        if (studentDocSnap.exists() || userDocSnap.exists()) {
          alreadyRegistered = true;
        }
      } catch {
        try {
          const idToken = await user.getIdToken();
          const pRes = await fetch("/api/auth/profile", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.exists) alreadyRegistered = true;
          }
        } catch {
          // ignore check error and proceed
        }
      }

      if (alreadyRegistered) {
        // Existing registered student! Route straight to dashboard
        router.replace("/student/dashboard");
        return;
      }

      // 2. Check if registration is open for new students
      if (config && config.registrationOpen === false) {
        await authSignOut();
        setErrorMessage({
          title: "Registration Closed",
          description: "Registration is currently closed. If you previously registered, please log in.",
        });
        return;
      }

      // 3. Validate College Identity (email format, 12-digit regNo, dept code)
      const validation = validateCollegeIdentity(email);
      if (!validation.isValid || !validation.registerNumber || !validation.departmentCode || !validation.department) {
        await authSignOut();
        setErrorMessage({
          title: "College Account Validation Failed",
          description:
            validation.error ||
            "Only official MSEC college Google accounts are permitted.",
        });
        return;
      }

      // 4. Pre-fill student name from email/Google profile (stripping any raw register numbers)
      const prefilledName = extractStudentNameFromIdentity(email, user.displayName);
      setStudentName(prefilledName);
      setSelectedYear("");
      setSelectedSection("");

      setIdentity({
        user,
        email: validation.email!,
        registerNumber: validation.registerNumber,
        departmentCode: validation.departmentCode,
        department: validation.department,
      });

      // Advance to Details Step
      setStep("details");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setErrorMessage(null);
      } else if (code === "auth/popup-blocked") {
        setErrorMessage({
          title: "Popup Blocked",
          description: "Please allow the Google sign-in popup in your browser and try again.",
        });
      } else {
        setErrorMessage({
          title: "Authentication Failed",
          description: "Could not complete Google sign-in. Please try again.",
        });
      }
    } finally {
      setAuthenticating(false);
    }
  }

  // STEP 2: Validate Details & Proceed to Confirmation Preview
  function handleProceedToConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!identity) return;

    const validation = validateStudentRegistrationData({
      name: studentName,
      year: selectedYear,
      section: selectedSection,
      departmentCode: identity.departmentCode,
      registerNumber: identity.registerNumber,
    });

    if (!validation.isValid) {
      setErrorMessage({
        title: "Incomplete Information",
        description: validation.error || "Please fill in all required fields.",
      });
      return;
    }

    setStep("confirm");
  }

  // STEP 3: Confirm Registration & Commit to Firestore
  async function handleFinalRegistration() {
    if (!identity) return;
    setErrorMessage(null);
    setCompleting(true);

    const { user, registerNumber, departmentCode, department } = identity;
    const trimmedName = studentName.trim();
    const yearNum = Number(selectedYear);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          registerNumber,
          year: yearNum,
          departmentCode,
          department: department.name,
          section: selectedSection,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        throw new Error(result.error || "Server failed to complete registration.");
      }

      // Refresh auth context so status becomes 'ready' and studentProfile is loaded
      await refreshAuth();

      // Store summary for success screen
      setRegisteredSummary({
        name: trimmedName,
        registerNumber,
        year: yearNum,
        department: department.name,
        section: selectedSection,
      });

      // Advance to Success Screen
      setStep("success");
    } catch (err: unknown) {
      console.error("[Euphoria Registration Error]:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Unable to complete your festival registration. Please check your connection and try again.";

      setErrorMessage({
        title: "Registration Error",
        description: errMsg,
      });
    } finally {
      setCompleting(false);
    }
  }

  // Cancel / Switch Account handler
  async function handleResetAuth() {
    await authSignOut();
    setIdentity(null);
    setStudentName("");
    setSelectedYear("");
    setSelectedSection("");
    setStep("auth");
    setErrorMessage(null);
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />

      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-6 text-center">
          <Logo festName={festName} size="md" />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Cultural Fest 2026</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Student Registration
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {step === "auth" && "Use your official MSEC Google account to register."}
            {step === "details" && "Confirm your details to complete festival registration."}
            {step === "confirm" && "Review and confirm your official student registration."}
            {step === "success" && "Your festival registration is complete!"}
          </p>
        </div>

        {/* Card Container */}
        <div
          className="rounded-[24px] p-6 sm:p-8 border shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Error Notice */}
          {errorMessage && (
            <div
              className="mb-6 rounded-2xl p-4 text-xs space-y-1"
              style={{
                background: "var(--error-soft)",
                color: "var(--error)",
                border: "1px solid var(--error)",
              }}
              role="alert"
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage.title}</span>
              </div>
              <p className="leading-relaxed opacity-90">{errorMessage.description}</p>
            </div>
          )}

          {/* Registration Closed Notice (Instant Real-Time Reaction) */}
          {config?.registrationOpen === false && step !== "success" ? (
            <div className="space-y-6 text-center py-4">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl shadow-sm"
                style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}
              >
                <Lock className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "var(--font-bricolage)" }}>
                  Registration is Currently Closed
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Student registration for {festName} has been paused or locked by festival administrators. Please check back later or contact your college event organizer.
                </p>
              </div>

              <div className="rounded-2xl border p-4 text-left bg-amber-50/60 border-amber-200/80">
                <p className="text-xs text-amber-900 font-medium">
                  <strong>Already registered earlier?</strong> You can still log in to your account and participate in live event voting.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
                >
                  <span>Student Log In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="w-full flex items-center justify-center rounded-2xl border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  style={{ minHeight: "48px" }}
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Google OAuth Entry Point */}
              {step === "auth" && (
            <div className="space-y-6 text-center">
              <div className="rounded-2xl border p-4 text-left bg-slate-50/70 border-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-900">
                      Official College Google Account Only
                    </p>
                    <p className="mt-0.5">
                      Your department will be auto-detected securely from your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={authenticating}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3.5 px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                style={{ minHeight: "52px" }}
              >
                {authenticating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
                    <span>Signing in with Google…</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-5 w-5" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="h-3 w-3" />
                <span>Only official @msec.edu.in accounts are accepted</span>
              </div>
            </div>
          )}

          {/* STEP 2: Collect / Confirm Details Form */}
          {step === "details" && identity && (
            <form onSubmit={handleProceedToConfirmation} className="space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Google account verified: {identity.email}</span>
              </div>

              {/* Student Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-600" />
                  <span>Student Name <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                />
              </div>

              {/* Register Number (Read-Only) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-purple-600" />
                  <span>Register Number (Auto-detected)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={identity.registerNumber}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-700 cursor-not-allowed"
                />
              </div>

              {/* Department (Read-Only, Auto-Detected) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Department (Auto-detected)</span>
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-800 flex items-center justify-between">
                  <span>{identity.department.name}</span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: identity.department.color }}
                  />
                </div>
              </div>

              {/* Year Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-purple-600" />
                  <span>Year of Study <span className="text-red-500">*</span></span>
                </label>
                <select
                  required
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value) || "")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                >
                  <option value="">Select Year</option>
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  <span>Section <span className="text-red-500">*</span></span>
                </label>
                <select
                  required
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                >
                  <option value="">Select Section</option>
                  <option value="NONE">No Section</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] cursor-pointer"
                  style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
                >
                  <span>Review Registration Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetAuth}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 underline py-1"
                >
                  Switch Google Account
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Confirmation Preview Screen */}
          {step === "confirm" && identity && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>College Account Verified ✓</span>
                </div>

                <div className="mt-3 space-y-2 text-xs border-t border-emerald-200/60 pt-3 text-emerald-950">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Name:</span>
                    <span className="font-bold text-slate-900">{studentName.trim()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Email:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[200px]">{identity.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Register Number:</span>
                    <span className="font-mono font-bold text-slate-900">{identity.registerNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Year:</span>
                    <span className="font-bold text-slate-900">{formatYearLabel(selectedYear)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Department:</span>
                    <span className="font-bold text-slate-900">{identity.department.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Department Code:</span>
                    <span className="font-mono font-bold text-slate-700">{identity.departmentCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800">Section:</span>
                    <span className="font-bold text-slate-900">{selectedSection === "NONE" ? "No Section" : `Section ${selectedSection}`}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 text-center leading-relaxed">
                Please verify that your details are accurate. Once registered, your profile will be locked to your college account.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleFinalRegistration}
                  disabled={completing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  style={{ background: "var(--gradient-hero)", minHeight: "50px" }}
                >
                  {completing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin text-white" />
                      <span>Creating your registration…</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Registration</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("details")}
                  disabled={completing}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Information</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success Screen */}
          {step === "success" && registeredSummary && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Registration Successful ✓
                </h2>
                <p className="text-xs text-slate-600">
                  Welcome to the {festName} Cultural Fest!
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{registeredSummary.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Register Number:</span>
                  <span className="font-mono font-bold text-slate-900">{registeredSummary.registerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Year:</span>
                  <span className="font-bold text-slate-900">{formatYearLabel(registeredSummary.year)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-bold text-slate-900">{registeredSummary.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Section:</span>
                  <span className="font-bold text-slate-900">{registeredSummary.section === "NONE" ? "No Section" : `Section ${registeredSummary.section}`}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await refreshAuth();
                  router.replace("/student/dashboard");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] cursor-pointer"
                style={{ background: "var(--gradient-hero)", minHeight: "50px" }}
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-bold text-primary hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Student Log In →
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Fest Organizers:{" "}
            <Link href="/organizer/login" className="font-semibold text-amber-700 underline hover:text-amber-800">
              Organizer Console
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
