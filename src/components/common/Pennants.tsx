/** Pennant/bunting SVG garland — purely decorative */
export function Pennants({ className = "" }: { className?: string }) {
  const colors = [
    "#3B4CCA", "#7C3AED", "#FF5A5F", "#F5B301",
    "#15803D", "#0EA5E9", "#EC4899", "#F97316",
  ];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 800 60"
      className={className}
      preserveAspectRatio="none"
    >
      {/* String */}
      <path
        d="M0 10 Q100 5 200 10 Q300 15 400 10 Q500 5 600 10 Q700 15 800 10"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
      />
      {/* Pennants */}
      {colors.map((color, i) => {
        const x = 50 + i * 100;
        return (
          <g key={i}>
            <polygon
              points={`${x - 10},10 ${x + 10},10 ${x},40`}
              fill={color}
              opacity="0.85"
            />
          </g>
        );
      })}
    </svg>
  );
}
