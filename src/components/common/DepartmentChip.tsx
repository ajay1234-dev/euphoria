import { cn } from "@/lib/utils";

interface DepartmentChipProps {
  name: string;
  shortName?: string;
  color: string;
  className?: string;
}

export function DepartmentChip({
  name,
  shortName,
  color,
  className,
}: DepartmentChipProps) {
  const displayName = shortName ?? name;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: `${color}18`, // 10% opacity
        color: "var(--ink)",
        border: `1px solid ${color}40`, // 25% opacity border
      }}
      title={name}
    >
      {/* Color dot */}
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {/* Short name text — color is never the ONLY identifier */}
      <span>{displayName}</span>
    </span>
  );
}
