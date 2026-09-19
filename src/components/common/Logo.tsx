import { cn } from "@/lib/utils";

interface LogoProps {
  festName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ festName = "Euphoria", className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight",
        sizes[size],
        className
      )}
      style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
    >
      {festName}
    </span>
  );
}
