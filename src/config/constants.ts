/** Department color swatches — 12 accessible colours paired with their labels */
export const DEPARTMENT_SWATCHES = [
  { hex: "#3B4CCA", label: "Indigo" },
  { hex: "#7C3AED", label: "Violet" },
  { hex: "#FF5A5F", label: "Coral" },
  { hex: "#F5B301", label: "Gold" },
  { hex: "#15803D", label: "Green" },
  { hex: "#0EA5E9", label: "Sky" },
  { hex: "#EC4899", label: "Pink" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#0D9488", label: "Teal" },
  { hex: "#8B5CF6", label: "Purple" },
  { hex: "#DC2626", label: "Red" },
  { hex: "#65A30D", label: "Lime" },
] as const;

export const VOTING_DURATION_PRESETS = [30, 60, 90, 120] as const;

export const MAX_ALLOWED_DOMAINS = 10;
export const MAX_PERFORMANCES_ORDER = 1000;
export const STUDENTS_PAGE_SIZE = 25;
export const CSV_BATCH_SIZE = 500;
export const VERIFY_EMAIL_POLL_INTERVAL_MS = 5000;
export const VERIFY_EMAIL_POLL_MAX_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Default preset cover images for cultural fest categories */
export const PERFORMANCE_PRESET_IMAGES = [
  {
    category: "boys-dance",
    label: "🕺 Boys Dance",
    url: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80",
  },
  {
    category: "girls-dance",
    label: "💃 Girls Dance",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    category: "boys-singing",
    label: "🎤 Boys Singing",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
  },
  {
    category: "girls-singing",
    label: "🎶 Girls Singing",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  },
  {
    category: "instrumental-music",
    label: "🎸 Instrumental",
    url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80",
  },
] as const;

export function getCategoryPresetImage(slug?: string, name?: string): string {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (s.includes("boys-dance") || (n.includes("boy") && n.includes("dance"))) {
    return "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("girls-dance") || (n.includes("girl") && n.includes("dance"))) {
    return "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("dance") || n.includes("dance")) {
    return "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("boys-sing") || (n.includes("boy") && (n.includes("sing") || n.includes("vocal")))) {
    return "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("girls-sing") || (n.includes("girl") && (n.includes("sing") || n.includes("vocal")))) {
    return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("sing") || n.includes("sing") || n.includes("vocal")) {
    return "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80";
  }
  if (s.includes("instrumental") || n.includes("instrumental") || n.includes("music")) {
    return "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80";
}

export function getPerformanceImage(
  perf?: { imageUrl?: string | null; name?: string } | null,
  cat?: { slug?: string; name?: string } | null
): string {
  if (perf?.imageUrl && perf.imageUrl.trim().length > 0) {
    return perf.imageUrl;
  }
  return getCategoryPresetImage(cat?.slug, cat?.name || perf?.name);
}
