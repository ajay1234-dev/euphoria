import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  description?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function SectionHeading({
  title,
  description,
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div className={cn("mb-6", className)}>
      <Tag
        className="text-2xl font-bold"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </Tag>
      {description && (
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}
