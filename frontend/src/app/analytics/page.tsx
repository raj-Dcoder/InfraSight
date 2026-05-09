"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  CircleDollarSign,
  Clock,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { analyticsApi } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_LABELS, TRUST_LABELS, formatINR, delayLabel } from "@/lib/utils";
import type { AnalyticsSummary, ProjectListItem } from "@/types";

function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  tone?: "brand" | "green" | "red" | "yellow" | "slate";
}) {
  const tones = {
    brand: "text-brand-400 bg-brand-500/10",
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    slate: "text-slate-500 bg-slate-500/10",
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{subtext}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  href,
}: {
  label: string;
  value: number;
  max: number;
  href?: string;
}) {
  const width = max > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
  const content = (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{label}</span>
        <span className="text-slate-600 dark:text-slate-400">{value.toLocaleString()}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-900/8 dark:bg-white/8 overflow-hidden">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
      </div>
    </>
  );

  if (!href) return <div>{content}</div>;
  return (
    <Link href={href} className="block group">
      {content}
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card p-5">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-5">{title}</h2>
      {children}
    </section>
  );
}

function AttentionProject({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block py-4 border-b border-slate-900/8 dark:border-white/8 last:border-b-0 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors line-clamp-2">
            {project.title}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {project.city || project.state} / {CATEGORY_LABELS[project.category]} / {formatINR(project.sanctioned_budget_inr)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-red-400">
            {project.delay_days && project.delay_days > 0 ? delayLabel(project.delay_days) : STATUS_LABELS[project.status]}
          </p>
          <p className="mt-1 text-xs text-slate-500">{TRUST_LABELS[project.verification_status]}</p>
        </div>
      </div>
    </Link>
  );
}

export default function AnalyticsPage() {
  const { data, error, isLoading } = useSWR<AnalyticsSummary>(
    "analytics-summary",
    () => analyticsApi.summary().then((response) => response.data)
  );

  const statusMax = Math.max(1, ...(data?.by_status.map((row) => row.count) ?? [1]));
  const categoryMax = Math.max(1, ...(data?.by_category.map((row) => row.count) ?? [1]));
  const cityBudgetMax = Math.max(1, ...(data?.by_city.map((row) => row.budget_inr) ?? [1]));

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 mb-3">
              <BarChart3 size={14} />
              Public Analytics
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
              Infrastructure Performance Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              A public view of project coverage, delay pressure, verification quality, complaints, and budget concentration.
            </p>
          </div>
          <Link href="/projects" className="btn-ghost text-sm py-2 px-4 w-fit">
            Browse records
          </Link>
        </div>

        {error && (
          <div className="glass-card p-8 border border-red-500/20 text-center">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Analytics could not be loaded</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Check that the backend server is running and refresh this page.</p>
          </div>
        )}

        {isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="glass-card p-5 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {data && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Projects Tracked"
                value={data.totals.total_projects.toLocaleString()}
                subtext={`${data.totals.verification_rate}% verified`}
                icon={<ShieldCheck size={20} />}
              />
              <MetricCard
                label="Total Sanctioned Budget"
                value={formatINR(data.totals.total_budget_inr)}
                subtext={`${formatINR(data.totals.total_spent_inr)} expenditure recorded`}
                icon={<CircleDollarSign size={20} />}
                tone="green"
              />
              <MetricCard
                label="Delayed Projects"
                value={data.totals.delayed_projects.toLocaleString()}
                subtext={`${data.totals.delay_rate}% of tracked projects`}
                icon={<Clock size={20} />}
                tone="red"
              />
              <MetricCard
                label="Public Complaints"
                value={data.totals.total_complaints.toLocaleString()}
                subtext="Submitted by citizens"
                icon={<FileWarning size={20} />}
                tone="yellow"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Section title="Project Status">
                <div className="space-y-4">
                  {data.by_status.map((row) => (
                    <BarRow
                      key={row.status}
                      label={STATUS_LABELS[row.status]}
                      value={row.count}
                      max={statusMax}
                      href={`/projects?status=${row.status}`}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Verification Quality">
                <div className="space-y-4">
                  {data.by_verification.map((row) => (
                    <BarRow
                      key={row.status}
                      label={TRUST_LABELS[row.status]}
                      value={row.count}
                      max={data.totals.total_projects}
                      href={`/projects?verification=${row.status}`}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Category Mix">
                <div className="space-y-4">
                  {data.by_category.map((row) => (
                    <BarRow
                      key={row.category}
                      label={CATEGORY_LABELS[row.category]}
                      value={row.count}
                      max={categoryMax}
                      href={`/projects?category=${row.category}`}
                    />
                  ))}
                </div>
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Budget by City">
                <div className="space-y-5">
                  {data.by_city.map((row) => {
                    const width = cityBudgetMax > 0 ? Math.max(5, Math.round((row.budget_inr / cityBudgetMax) * 100)) : 0;
                    return (
                      <Link key={row.city} href={`/projects?city=${encodeURIComponent(row.city)}`} className="block group">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-brand-400 transition-colors">{row.city}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-500">{row.count.toLocaleString()} projects</p>
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{formatINR(row.budget_inr)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-900/8 dark:bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${width}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Section>

              <Section title="Needs Attention">
                {data.attention_projects.length > 0 ? (
                  <div>
                    {data.attention_projects.map((project) => (
                      <AttentionProject key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <CheckCircle size={28} className="mx-auto text-green-400 mb-3" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">No delayed or disputed projects are currently flagged.</p>
                  </div>
                )}
              </Section>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/8 p-4 text-sm text-slate-700 dark:text-slate-300">
              <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
              <p>
                These numbers reflect records currently loaded into InfraSight. Missing government data, unverified documents, and local reporting gaps can change the picture as more sources are connected.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
