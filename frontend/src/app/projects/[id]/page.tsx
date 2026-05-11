"use client";

import { use, useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  StatusBadge, CategoryChip, ProgressBar,
  DelayChip,
} from "@/components/ui/Badges";
import { projectsApi } from "@/lib/api";
import type { ProjectDetail, Complaint, Document as ProjectDocument } from "@/types";
import { formatINR, formatDate } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Calendar, ExternalLink,
  MessageSquare, Clock, AlertTriangle, CheckCircle,
  Users, IndianRupee, Activity, Cpu, Image,
  Send, BadgeCheck, XCircle, Edit3
} from "lucide-react";
import { ProjectEditModal } from "@/components/admin/ProjectEditModal";
import { ProjectComplaintForm } from "@/components/projects/ProjectComplaintForm";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectDetailSkeleton";
import { ProjectEvidencePanel } from "@/components/projects/ProjectEvidencePanel";

interface Props { params: Promise<{ id: string }> }

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("access_token"));
  }, []);

  const { data: project, isLoading, error, mutate } = useSWR<ProjectDetail>(
    `project-${id}`,
    () => projectsApi.get(id).then((r) => r.data)
  );
  const { data: complaints = [] } = useSWR<Complaint[]>(
    project ? `complaints-${id}` : null,
    () => projectsApi.complaints(id).then((r) => r.data)
  );
  const { data: updates = [] } = useSWR(
    project ? `updates-${id}` : null,
    () => projectsApi.updates(id).then((r) => r.data)
  );
  const { data: documents = [] } = useSWR<ProjectDocument[]>(
    project ? `documents-${id}` : null,
    () => projectsApi.documents(id).then((r) => r.data)
  );

  if (error) return notFound();
  const catKey = project?.category?.toLowerCase() ?? "other";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-300 font-sans pb-16">
      <Navbar />
      {project && <div className={`h-1 w-full cat-${catKey}`} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Projects
          </Link>
          {isLoggedIn && project && (
            <button
              onClick={() => setEditing(true)}
              className="btn-ghost py-1.5 px-4 text-xs flex items-center gap-2 border-brand-500/20 text-brand-400 hover:bg-brand-500/10"
            >
              <Edit3 size={14} /> Edit Project
            </button>
          )}
        </div>

        {isLoading ? (
          <ProjectDetailSkeleton />
        ) : project ? (
          <div className="space-y-6 animate-fade-in">

            {/* 1. BASIC INFORMATION & STATUS */}
            <div className="glass-card p-6 sm:p-8 space-y-5">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">
                    ID: {project.project_code || "N/A"}
                  </span>
                  <CategoryChip category={project.category} />
                  <span className="tag-pill bg-white/5 border-white/10 text-slate-300">
                    Type: {project.sub_category || "Infrastructure"}
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">{project.title}</h1>
                {project.description && <p className="text-slate-400 text-sm mt-3">{project.description}</p>}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <StatusBadge status={project.status} />
                  {project.delay_days && project.delay_days > 0 && <DelayChip delayDays={project.delay_days} />}
                </div>
                <div className="w-full sm:w-64">
                  <ProgressBar value={project.physical_progress_pct ?? 0} status={project.status} label="Progress" />
                </div>
              </div>
            </div>

            <ProjectEvidencePanel project={project} documents={documents} />

            {/* 2. LOCATION DETAILS */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <MapPin size={16} className="text-brand-400" /> Location Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                <div className="space-y-3">
                  <InfoRow label="State" value={project.state || "N/A"} />
                  <InfoRow label="City/District" value={[project.city, project.district].filter(Boolean).join(", ") || "N/A"} />
                  <InfoRow label="Area/Locality" value={project.ward || "N/A"} />
                  <InfoRow label="Pincode" value={project.pincode || "N/A"} mono />
                </div>
                <div className="space-y-3">
                  <InfoRow label="Latitude" value={project.location?.lat ? project.location.lat.toFixed(6) : (project.lat ? project.lat.toFixed(6) : "N/A")} mono />
                  <InfoRow label="Longitude" value={project.location?.lng ? project.location.lng.toFixed(6) : (project.lng ? project.lng.toFixed(6) : "N/A")} mono />
                </div>
              </div>
              {/* Map View */}
              <div className="h-64 w-full rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden relative">
                {(project.location?.lat && project.location?.lng) || (project.lat && project.lng) ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(project.location?.lng ?? project.lng!) - 0.01},${(project.location?.lat ?? project.lat!) - 0.01},${(project.location?.lng ?? project.lng!) + 0.01},${(project.location?.lat ?? project.lat!) + 0.01}&layer=mapnik&marker=${project.location?.lat ?? project.lat},${project.location?.lng ?? project.lng}`}
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <MapPin size={24} className="mb-2 opacity-50" />
                    <span className="text-sm">Coordinates unavailable</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. RESPONSIBILITY */}
            <div className="glass-card p-6 border-2 border-brand-500/40 shadow-[0_0_20px_rgba(56,189,248,0.12)] relative overflow-hidden">
              <h2 className="font-semibold text-brand-100 text-base uppercase tracking-widest flex items-center gap-2 mb-6">
                <Users size={18} className="text-brand-400" /> Responsibility
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Executing Authority */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-slate-400 mb-1">Executing Authority</div>
                  {project.authority ? (
                    <Link
                      href={`/authorities/${project.authority.id}`}
                      className="font-bold text-white text-lg mb-3 inline-flex items-center gap-2 hover:text-brand-300 transition-colors"
                    >
                      {project.authority.canonical_name}
                      <ExternalLink size={13} className="opacity-60" />
                    </Link>
                  ) : (
                    <div className="font-bold text-white text-lg mb-3">Not assigned</div>
                  )}
                  <div className="space-y-2">
                    <InfoRow label="Department" value={project.authority?.authority_type || "N/A"} />
                    <InfoRow label="Officer Name" value={project.authority?.nodal_officer || "N/A"} />
                  </div>
                </div>
                {/* Contractor */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-slate-400 mb-1">Contractor Details</div>
                  {project.contractor ? (
                    <Link
                      href={`/contractors/${project.contractor.id}`}
                      className="font-bold text-white text-lg mb-3 inline-flex items-center gap-2 hover:text-brand-300 transition-colors"
                    >
                      {project.contractor.canonical_name}
                      <ExternalLink size={13} className="opacity-60" />
                    </Link>
                  ) : (
                    <div className="font-bold text-white text-lg mb-3">Not awarded</div>
                  )}
                  <div className="space-y-2">
                    <InfoRow label="Contractor ID" value={project.contractor?.registration_number || "N/A"} mono />
                    {project.contractor?.blacklisted && (
                      <div className="mt-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 rounded flex items-center gap-2">
                        <AlertTriangle size={14} /> Blacklisted Contractor
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Consultant / Supervisor */}
              <div className="mt-5 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Consultant / Supervisor</div>
                  <div className="font-medium text-slate-300 text-sm">
                    {project.consultant_name || project.supervisor_name 
                      ? [project.consultant_name, project.supervisor_name].filter(Boolean).join(" / ")
                      : "Third-Party Quality Monitor (Pending)"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">Responsibility record</span>
                  <BadgeCheck className={project.consultant_name ? "text-brand-400" : "text-slate-500"} size={20} />
                </div>
              </div>
            </div>

            {/* 4. FINANCIAL DETAILS */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <IndianRupee size={16} className="text-yellow-400" /> Financial Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Total Budget Allocated</div>
                  <div className="text-lg font-bold text-white">{formatINR(project.sanctioned_budget_inr)}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Amount Spent</div>
                  <div className="text-lg font-bold text-green-400">{formatINR(project.expenditure_inr)}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Funding Source</div>
                  <div className="text-sm font-medium text-white mt-1">{project.funding_source || "N/A"}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Cost Overrun</div>
                  {project.revised_budget_inr && project.sanctioned_budget_inr && project.revised_budget_inr > project.sanctioned_budget_inr ? (
                    <div>
                      <span className="text-sm font-bold text-red-400">Yes</span>
                      <div className="text-xs text-red-300 mt-1">+{formatINR(project.revised_budget_inr - project.sanctioned_budget_inr)}</div>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-green-400">No</span>
                  )}
                </div>
              </div>
            </div>

            {/* 5. TIMELINE */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <Calendar size={16} className="text-purple-400" /> Timeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <InfoRow label="Project Start Date" value={formatDate(project.start_date) || "N/A"} />
                  <InfoRow label="Expected Completion" value={formatDate(project.original_end_date) || "N/A"} />
                  <InfoRow label="Actual Completion" value={formatDate(project.actual_completion_date) || "N/A"} />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-center items-center text-center">
                  <div className="text-xs text-slate-400 mb-2">Delay Status</div>
                  {project.delay_days && project.delay_days > 0 ? (
                    <>
                      <div className="text-lg font-bold text-red-400 mb-1">Delayed</div>
                      <div className="text-sm text-red-300">Duration: {project.delay_days} days</div>
                      {project.delay_reason && (
                        <div className="mt-2 text-xs text-red-200 italic opacity-80">Reason: {project.delay_reason}</div>
                      )}
                    </>
                  ) : project.status === "COMPLETED" ? (
                    <div className="text-lg font-bold text-green-400 mb-1">On Time</div>
                  ) : (
                    <div className="text-lg font-bold text-blue-400 mb-1">On Track</div>
                  )}
                </div>
              </div>
            </div>

            {/* 6. CURRENT STATUS */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <Activity size={16} className="text-blue-400" /> Current Status
              </h2>
              <div className="flex flex-wrap gap-x-12 gap-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Status</span>
                  <span className="text-sm font-medium text-white">{project.status.replace("_", " ")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Last Updated</span>
                  <span className="text-sm font-medium text-white">{formatDate(project.updated_at) || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Progress %</span>
                  <span className="text-sm font-medium text-brand-400">
                    {project.physical_progress_pct != null ? `${project.physical_progress_pct}%` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* 8. PUBLIC REPORTS / COMPLAINTS */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={16} className="text-red-400" /> Public Reports & Complaints
                </h2>
                <div className="text-xs font-medium bg-red-500/20 text-red-400 px-2 py-1 rounded">
                  Total: {complaints.length}
                </div>
              </div>
              
              {complaints.length > 0 ? (
                <div className="space-y-4 mb-5">
                  {complaints.map(c => (
                    <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{c.title}</div>
                          <div className="text-xs text-slate-500">User ID: Anonymized • {formatDate(c.created_at)}</div>
                        </div>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {(c.status || 'SUBMITTED').replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{c.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Image size={12} />
                        {c.evidence_urls?.length ? (
                          c.evidence_urls.map((url, index) => (
                            <a
                              key={url}
                              href={url}
                              className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                            >
                              Evidence {index + 1}
                            </a>
                          ))
                        ) : (
                          <span>No evidence attached</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white/5 rounded-lg border border-white/10 mb-5">
                  <p className="text-sm text-slate-400">No complaints reported yet.</p>
                </div>
              )}

              <button onClick={() => setComplaintOpen(!complaintOpen)} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                <Send size={14} /> File a New Report
              </button>
              {complaintOpen && (
                <ProjectComplaintForm
                  projectId={project.id}
                  onClose={() => setComplaintOpen(false)}
                  onSubmitted={() => mutate()}
                />
              )}
            </div>

            {/* 9. PROJECT UPDATES / HISTORY */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <Clock size={16} className="text-brand-400" /> Project Updates & History
              </h2>
              {updates.length > 0 ? (
                <div className="space-y-5 pl-3 border-l-2 border-white/10 py-2">
                  {(updates as any[]).map((u: any) => (
                    <div key={u.id} className="relative pl-5">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-[#0a0f1a]" />
                      <div className="text-xs text-brand-400 mb-1">{formatDate(u.created_at)}</div>
                      <div className="text-sm text-white font-medium mb-1">{u.title}</div>
                      {u.content && <div className="text-sm text-slate-400">{u.content}</div>}
                      <div className="text-xs text-slate-500 mt-2">Source: Official Update</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No updates history available.</p>
              )}
            </div>

            {/* 10. ACCOUNTABILITY SIGNALS */}
            <div className="glass-card p-6 bg-gradient-to-r from-brand-900/20 to-purple-900/20 border-purple-500/20">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1">
                  <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
                    <BadgeCheck size={16} className="text-purple-400" /> Accountability Signals
                  </h2>
                  <p className="text-xs text-slate-400">A quick read of available delay, complaint, budget, and update signals. This is not an audit finding.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      {project.delay_days && project.delay_days > 0 ? <AlertTriangle size={12} className="text-yellow-400"/> : <CheckCircle size={12} className="text-green-400"/>}
                      {project.delay_days && project.delay_days > 0 ? "Delay reported" : "No active delay flag"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {project.complaint_count > 0 ? <AlertTriangle size={12} className="text-yellow-400"/> : <CheckCircle size={12} className="text-green-400"/>}
                      {project.complaint_count > 0 ? `${project.complaint_count} public reports` : "No public reports"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {project.financial_progress_pct != null ? <CheckCircle size={12} className="text-green-400"/> : <XCircle size={12} className="text-slate-500"/>}
                      {project.financial_progress_pct != null ? "Financial progress recorded" : "Spend data missing"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {updates.length > 0 ? <CheckCircle size={12} className="text-green-400"/> : <XCircle size={12} className="text-slate-500"/>}
                      {updates.length > 0 ? "Updates available" : "No update history"}
                    </div>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 flex items-center justify-center relative shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-400 border-t-transparent border-r-transparent rotate-45"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{project.accountability_score ?? "N/A"}</div>
                    <div className="text-[10px] text-purple-300 uppercase">
                      {project.accountability_score == null ? "Needs Review" :
                       project.accountability_score > 80 ? "Strong" :
                       project.accountability_score > 60 ? "Mixed" : "Weak"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 11. EXPERIMENTAL INSIGHTS */}
            <div className="glass-card p-6 border border-white/5 border-dashed bg-black/20">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <Cpu size={16} className="text-indigo-400" /> Experimental Insights
                </h2>
                {!project.ai_insights && (
                  <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Not Available</span>
                )}
              </div>
              {project.ai_insights ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <div className="text-xs font-semibold text-white mb-1">Risk Note</div>
                    <div className="text-sm text-slate-400">{project.ai_insights.risk_prediction || "No risk note recorded"}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <div className="text-xs font-semibold text-white mb-1">Delay Note</div>
                    <div className="text-sm text-slate-400">{project.ai_insights.delay_probability || "No delay note recorded"}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <div className="text-xs font-semibold text-white mb-1">Quality Note</div>
                    <div className="text-sm text-slate-400">{project.ai_insights.quality_issues || "No quality note recorded"}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No automated analysis is attached to this record yet. Use the source links, documents, updates, and public reports above for review.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {editing && project && (
        <ProjectEditModal
          project={project}
          onClose={() => setEditing(false)}
          onUpdate={() => {
            setEditing(false);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs text-slate-300 text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
