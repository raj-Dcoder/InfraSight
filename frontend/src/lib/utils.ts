import {
  ProjectStatus,
  ProjectCategory,
  VerificationStatus,
} from "@/types";

// ── Status helpers ───────────────────────

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED:     "Planned",
  TENDERED:    "Tendered",
  IN_PROGRESS: "In Progress",
  DELAYED:     "Delayed",
  COMPLETED:   "Completed",
  ABANDONED:   "Abandoned",
  ON_HOLD:     "On Hold",
};

export const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  PLANNED:     "badge badge-planned",
  TENDERED:    "badge badge-tendered",
  IN_PROGRESS: "badge badge-inprogress",
  DELAYED:     "badge badge-delayed",
  COMPLETED:   "badge badge-completed",
  ABANDONED:   "badge badge-abandoned",
  ON_HOLD:     "badge badge-onhold",
};

export const STATUS_DOT_COLOR: Record<ProjectStatus, string> = {
  PLANNED:     "#6366f1",
  TENDERED:    "#8b5cf6",
  IN_PROGRESS: "#f59e0b",
  DELAYED:     "#ef4444",
  COMPLETED:   "#10b981",
  ABANDONED:   "#6b7280",
  ON_HOLD:     "#f97316",
};

// ── Category helpers ─────────────────────

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  ROAD:        "Road",
  BRIDGE:      "Bridge",
  BUILDING:    "Building",
  WATER:       "Water",
  SANITATION:  "Sanitation",
  ELECTRICITY: "Electricity",
  RAILWAY:     "Railway",
  METRO:       "Metro",
  PORT:        "Port",
  AIRPORT:     "Airport",
  OTHER:       "Other",
};

export const CATEGORY_ICONS: Record<ProjectCategory, string> = {
  ROAD:        "🛣️",
  BRIDGE:      "🌉",
  BUILDING:    "🏢",
  WATER:       "💧",
  SANITATION:  "🚿",
  ELECTRICITY: "⚡",
  RAILWAY:     "🚂",
  METRO:       "🚇",
  PORT:        "⚓",
  AIRPORT:     "✈️",
  OTHER:       "🏗️",
};

// ── Verification helpers ─────────────────

export const TRUST_LABELS: Record<VerificationStatus, string> = {
  VERIFIED:          "Verified",
  UNVERIFIED:        "Unverified",
  COMMUNITY_VERIFIED: "Community Verified",
  DISPUTED:          "Disputed",
  RETRACTED:         "Retracted",
};

export const TRUST_BADGE_CLASS: Record<VerificationStatus, string> = {
  VERIFIED:          "badge trust-verified",
  UNVERIFIED:        "badge trust-unverified",
  COMMUNITY_VERIFIED: "badge trust-community",
  DISPUTED:          "badge trust-disputed",
  RETRACTED:         "badge trust-disputed",
};

// ── Budget formatting ────────────────────

export function formatINR(amount?: number | null): string {
  if (amount == null) return "—";
  if (amount >= 1_00_00_00_000) {
    return `₹${(amount / 1_00_00_00_000).toFixed(1)}T Cr`;
  }
  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Date helpers ─────────────────────────

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function delayLabel(days?: number | null): string {
  if (days == null || days <= 0) return "";
  if (days < 30) return `${days}d delayed`;
  if (days < 365) return `${Math.floor(days / 30)}mo delayed`;
  return `${(days / 365).toFixed(1)}yr delayed`;
}

// ── Map marker colors ────────────────────

export function markerColor(status: ProjectStatus): string {
  return STATUS_DOT_COLOR[status] ?? "#6b7280";
}
