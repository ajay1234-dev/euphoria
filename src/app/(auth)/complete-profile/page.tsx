"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useData";
import { normalizeStudentId, emailDomain } from "@/lib/utils";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { z } from "zod";

const completeProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(80),
  studentId: z.string().optional(),
  departmentId: z.string().nullable().optional(),
});
type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

function CompleteProfileForm() {
  const { status, user, config } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { departments, loading: deptsLoading } = useDepartments();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hadBatchError = searchParams.get("error") === "batch";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "ready") router.replace("/vote");
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
  });

  if (status === "loading") return <PageSkeleton />;

  async function onSubmit(values: CompleteProfileInput) {
    if (!user || !config) return;
    setServerError(null);
    setSubmitting(true);

    const email = user.email?.toLowerCase() ?? "";
    const rawStudentId = values.studentId?.trim() ?? "";
    const studentId = rawStudentId ? normalizeStudentId(rawStudentId) : null;

    if (config.requireStudentId && !studentId) {
      setServerError("Student ID is required. Please enter your student ID.");
      setSubmitting(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      const userDocRef = doc(db, "users", user.uid);
      batch.set(userDocRef, {
        uid: user.uid,
        fullName: values.fullName.trim(),
        email,
        emailDomain: emailDomain(email),
        studentId,
        departmentId: values.departmentId ?? null,
        emailVerified: user.emailVerified,
        verifiedAt: null,
        createdAt: serverTimestamp(),
      });

      if (studentId) {
        batch.set(doc(db, "studentIdClaims", studentId), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      router.replace("/verify-email");
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes("permission-denied")
          ? "This Student ID may already be registered, or registration has closed. Contact festival administration."
          : "Couldn't save your profile. Please try again.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo festName={config?.festName ?? "Euphoria"} size="md" />
          <h1 className="mt-3 text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Complete your profile
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            We need a few more details to finish setting up your account.
          </p>
        </div>

        <div
          className="rounded-[20px] p-6"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          {hadBatchError && (
            <div
              className="mb-4 rounded-xl p-3 text-sm"
              style={{
                background: "var(--warning-soft)",
                color: "var(--warning)",
                border: "1px solid var(--warning)",
              }}
              role="alert"
            >
              We had trouble saving your profile. Please try again below.
            </div>
          )}
          {serverError && (
            <div
              className="mb-4 rounded-xl p-3 text-sm"
              style={{
                background: "var(--error-soft)",
                color: "var(--error)",
                border: "1px solid var(--error)",
              }}
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Full name <span aria-hidden="true" style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                className="w-full rounded-[12px] border px-3 py-3 text-base outline-none"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                }}
                {...register("fullName")}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p className="text-xs font-medium" style={{ color: "var(--error)" }} role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {config?.requireStudentId && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="studentId" className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  Student ID <span aria-hidden="true" style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  id="studentId"
                  type="text"
                  autoComplete="off"
                  className="w-full rounded-[12px] border px-3 py-3 text-base uppercase outline-none"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                  }}
                  {...register("studentId")}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="departmentId" className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Department
              </label>
              <select
                id="departmentId"
                className="w-full rounded-[12px] border px-3 py-3 text-base outline-none bg-white"
                style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
                {...register("departmentId")}
              >
                <option value="">Other / not listed</option>
                {!deptsLoading &&
                  departments.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[14px] py-3.5 text-base font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
            >
              {submitting ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompleteProfileForm />
    </Suspense>
  );
}
