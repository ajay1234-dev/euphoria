"use client";

import { useAuth } from "@/hooks/useAuth";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";

export default function NotEligiblePage() {
  const { config, signOutUser } = useAuth();

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 text-center"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />
      <div className="w-full max-w-md">
        <Logo festName={config?.festName ?? "Euphoria"} size="md" className="mb-6" />
        <div
          className="rounded-[20px] p-8"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--error-soft)" }}
            aria-hidden="true"
          >
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold mb-3" style={{ color: "var(--ink)" }}>
            Email not eligible
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
            Only official college email addresses can participate in{" "}
            {config?.festName ?? "this fest"}.{" "}
            {config?.allowedEmailDomains.length
              ? `Eligible domains: ${config.allowedEmailDomains.map((d) => `@${d}`).join(", ")}.`
              : ""}
            {" "}If you believe this is a mistake, contact the organizers.
          </p>
          <button
            onClick={signOutUser}
            className="w-full rounded-[14px] py-3.5 text-base font-semibold text-white"
            style={{ background: "var(--error)", minHeight: "48px" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
