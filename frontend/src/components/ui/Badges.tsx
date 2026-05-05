"use client";

import {
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  TRUST_LABELS,
  TRUST_BADGE_CLASS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  formatINR,
  formatDate,
  delayLabel,
} from "@/lib/utils";
import type { ProjectStatus, VerificationStatus, ProjectCategory } from "@/types";
import { Clock, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

// â”€â”€ StatusBadge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface StatusBadgeProps {
  status: ProjectStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const icons: Partial<Record<ProjectStatus, React.ReactNode>> = {
    COMPLETED:   <CheckCircle2 size={11} />,
    DELAYED:     <AlertTriangle size={11} />,
    IN_PROGRESS: <Clock size={11} />,
    PLANNED:     <Circle size={11} />,
  };
  return (
    <span className={STATUS_BADGE_CLASS[status]}>
      {showIcon && icons[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}

// â”€â”€ TrustBadge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TrustBadgeProps {
  status: VerificationStatus;
}

export function TrustBadge({ status }: TrustBadgeProps) {
  const icons: Record<string, string> = {
    VERIFIED: "âœ“",
    UNVERIFIED: "?",
    COMMUNITY_VERIFIED: "ðŸ‘¥",
    DISPUTED: "âš ",
    RETRACTED: "âœ—",
  };
  return (
    <span className={TRUST_BADGE_CLASS[status]}>
      {icons[status]} {TRUST_LABELS[status]}
    </span>
  );
}

// â”€â”€ CategoryChip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CategoryChipProps {
  category: ProjectCategory;
}
export function CategoryChip({ category }: CategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-900/5 dark:bg-white/5 px-2 py-1 rounded-full border border-slate-900/10 dark:border-white/10">
      {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
    </span>
  );
}

// â”€â”€ ProgressBar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ProgressBarProps {
  value?: number;
  status: ProjectStatus;
  label?: string;
}

export function ProgressBar({ value, status, label }: ProgressBarProps) {
  const pct = value ?? 0;
  const fillClass =
    status === "COMPLETED"
      ? "progress-fill completed"
      : status === "DELAYED"
      ? "progress-fill delayed"
      : "progress-fill";

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600 dark:text-slate-500">{label}</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
        </div>
      )}
      <div className="progress-track">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// â”€â”€ BudgetDisplay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface BudgetDisplayProps {
  sanctioned?: number;
  revised?: number;
  expenditure?: number;
}

export function BudgetDisplay({ sanctioned, revised, expenditure }: BudgetDisplayProps) {
  const display = revised ?? sanctioned;
  const isRevised = revised && sanctioned && revised !== sanctioned;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-900 dark:text-white">{formatINR(display)}</span>
        {isRevised && (
          <span className="text-xs line-through text-slate-600 dark:text-slate-500">{formatINR(sanctioned)}</span>
        )}
      </div>
      {expenditure != null && (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Spent: <span className="text-slate-200">{formatINR(expenditure)}</span>
          {display ? (
            <span className="ml-1 text-slate-600 dark:text-slate-500">
              ({Math.round((expenditure / display) * 100)}%)
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// â”€â”€ DelayChip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DelayChipProps {
  delayDays?: number;
}

export function DelayChip({ delayDays }: DelayChipProps) {
  if (!delayDays || delayDays <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-900/20 border border-red-800/40 px-2 py-0.5 rounded-full">
      <AlertTriangle size={10} />
      {delayLabel(delayDays)}
    </span>
  );
}

// â”€â”€ InfoRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface InfoRowProps {
  label: string;
  value?: string | null;
  mono?: boolean;
}

export function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-900/5 dark:border-white/5">
      <span className="text-sm text-slate-600 dark:text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-sm text-right text-slate-200 ${mono ? "font-mono" : ""}`}
      >
        {value ?? "â€”"}
      </span>
    </div>
  );
}

// â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SkeletonProps {
  className?: string;
}
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function ProjectCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
