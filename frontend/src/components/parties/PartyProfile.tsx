"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { formatINR } from "@/lib/utils";
import type { PartyStats, ProjectListItem } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
} from "lucide-react";

interface PartyProfileProps {
  kind: "contractor" | "authority";
  name: string;
  subtitle?: string;
  website?: string;
  warning?: string;
  details: Array<{ label: string; value?: string | null }>;
  stats: PartyStats;
  projects: ProjectListItem[];
}

export function PartyProfile({
  kind,
  name,
  subtitle,
  website,
  warning,
  details,
  stats,
  projects,
}: PartyProfileProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <section className="glass-card p-6 sm:p-8 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-brand-400 mb-3">
                <Building2 size={14} />
                {kind === "contractor" ? "Contractor Profile" : "Authority Profile"}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{name}</h1>
              {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{subtitle}</p>}
              {warning && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  <AlertTriangle size={15} /> {warning}
                </div>
              )}
            </div>
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex items-center gap-2 w-fit">
                <ExternalLink size={15} /> Official Website
              </a>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard label="Projects" value={stats.total_projects.toLocaleString()} />
          <StatCard label="Delayed" value={stats.delayed_projects.toLocaleString()} tone={stats.delayed_projects > 0 ? "warn" : "ok"} />
          <StatCard label="Completed" value={stats.completed_projects.toLocaleString()} tone="ok" />
          <StatCard label="Budget" value={formatINR(stats.total_budget_inr)} />
          <StatCard label="Complaints" value={stats.total_complaints.toLocaleString()} tone={stats.total_complaints > 0 ? "warn" : "ok"} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="glass-card p-6 h-fit">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
              <FileText size={15} className="text-brand-400" /> Record Details
            </h2>
            <div className="space-y-3">
              {details.map((item) => (
                <div key={item.label} className="border-b border-slate-900/5 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="text-xs text-slate-600 dark:text-slate-500">{item.label}</div>
                  <div className="text-sm text-slate-900 dark:text-white mt-1 break-words">{item.value || "N/A"}</div>
                </div>
              ))}
            </div>
          </aside>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Linked Projects</h2>
              <span className="text-xs text-slate-600 dark:text-slate-500">{projects.length} shown</span>
            </div>
            {projects.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
              </div>
            ) : (
              <div className="glass-card p-8 text-center text-sm text-slate-600 dark:text-slate-400">
                No linked projects found for this record.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const iconClass = tone === "warn" ? "text-yellow-400" : tone === "ok" ? "text-green-400" : "text-brand-400";

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500 mb-2">
        <CheckCircle2 size={12} className={iconClass} />
        {label}
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
