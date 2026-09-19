/** Simple full-page loading skeleton — shown while auth state is resolving */
export function PageSkeleton() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4"
      style={{ background: "var(--bg)" }}
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Animated bars */}
      <div className="w-full max-w-sm space-y-3 animate-pulse">
        <div
          className="h-8 rounded-xl"
          style={{ background: "var(--surface-alt)" }}
        />
        <div
          className="h-4 rounded-xl w-3/4"
          style={{ background: "var(--surface-alt)" }}
        />
        <div
          className="h-4 rounded-xl w-1/2"
          style={{ background: "var(--surface-alt)" }}
        />
      </div>
    </div>
  );
}
