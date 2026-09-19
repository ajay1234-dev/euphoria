/** Festive background with soft gradient blobs — purely decorative */
export function FestBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* Primary blob */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,76,202,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Secondary blob */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)",
        }}
      />
      {/* Warm accent */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,179,1,0.04) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
