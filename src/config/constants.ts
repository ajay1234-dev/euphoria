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
