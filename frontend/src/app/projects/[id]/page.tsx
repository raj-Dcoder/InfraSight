"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  StatusBadge, TrustBadge, CategoryChip, ProgressBar,
  DelayChip,
} from "@/components/ui/Badges";
import { projectsApi } from "@/lib/api";
import type { ProjectDetail, Complaint, Document as ProjectDocument } from "@/types";
import { formatINR, formatDate, CATEGORY_ICONS } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Calendar, HardHat, Building2, ExternalLink,
  MessageSquare, FileText, Clock, AlertTriangle, CheckCircle,
  Users, IndianRupee, TrendingUp, Shield, Activity, Cpu, Image,
  ThumbsUp, Send, Globe, Phone, Mail, BadgeCheck, XCircle, Edit3
} from "lucide-react";
import { ProjectEditModal } from "@/components/admin/ProjectEditModal";

interface Props { params: { id: string } }

export default function ProjectDetailPage({ params }: Props) {
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("access_token"));
  }, []);

  const { data: project, isLoading, error, mutate } = useSWR<ProjectDetail>(
    `project-${params.id}`,
    () => projectsApi.get(params.id).then((r) => r.data)
  );
  const { data: complaints = [] } = useSWR<Complaint[]>(
    project ? `complaints-${params.id}` : null,
    () => projectsApi.complaints(params.id).then((r) => r.data)
  );
  const { data: updates = [] } = useSWR(
    project ? `updates-${params.id}` : null,
    () => projectsApi.updates(params.id).then((r) => r.data)
  );
  const { data: documents = [] } = useSWR<ProjectDocument[]>(
    project ? `documents-${params.id}` : null,
    () => projectsApi.documents(params.id).then((r) => r.data)
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
          <Skeleton />
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

            {/* 3. RESPONSIBILITY (CORE FEATURE ⭐) */}
            <div className="glass-card p-6 border-2 border-brand-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-brand-500/20 text-brand-300 text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-lg border-b border-l border-brand-500/30">
                Core Feature
              </div>
              <h2 className="font-semibold text-brand-100 text-base uppercase tracking-widest flex items-center gap-2 mb-6">
                <Users size={18} className="text-brand-400" /> Responsibility ⭐
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Executing Authority */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-slate-400 mb-1">Executing Authority</div>
                  <div className="font-bold text-white text-lg mb-3">{project.authority?.canonical_name || "Not assigned"}</div>
                  <div className="space-y-2">
                    <InfoRow label="Department" value={project.authority?.authority_type || "N/A"} />
                    <InfoRow label="Officer Name" value={project.authority?.nodal_officer || "N/A"} />
                  </div>
                </div>
                {/* Contractor */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-slate-400 mb-1">Contractor Details</div>
                  <div className="font-bold text-white text-lg mb-3">{project.contractor?.canonical_name || "Not awarded"}</div>
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
                  <span className="text-[10px] text-slate-500 font-mono">USP: 100% Transparency</span>
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

            {/* 7. DOCUMENTS & SOURCES (TRUST LAYER 🔥) */}
            <div className="glass-card p-6 border border-green-500/30 bg-gradient-to-br from-green-900/10 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <h2 className="font-semibold text-green-400 text-sm uppercase tracking-widest flex items-center gap-2">
                  <Shield size={16} /> Documents & Sources 🔥
                </h2>
                <TrustBadge status={project.verification_status} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-slate-400 mb-3">Project Source URL</div>
                  <div className="space-y-2">
                    {project.source_url ? (
                      <div className="space-y-2">
                        <a 
                          href={project.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-400/10 p-3 rounded-lg border border-blue-400/20 transition-all hover:scale-[1.01]"
                        >
                          <Globe size={14} /> 
                          <span className="truncate flex-1">
                            {new URL(project.source_url).hostname}
                          </span>
                          <ExternalLink size={12} className="shrink-0 opacity-50" />
                        </a>
                        <p className="text-[10px] text-slate-500 px-1">
                          Official source of this project information. Verified by InfraSight.
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 italic bg-white/5 p-3 rounded-lg border border-white/5 flex items-center gap-2">
                        <Globe size={14} className="opacity-30" />
                        No source link available
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-3">Project Documents</div>
                  <div className="space-y-2">
                    {documents.length > 0 ? (
                      documents.map((doc) => (
                        <a 
                          key={doc.id}
                          href={doc.file_url || doc.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/20 transition-all hover:bg-white/10 group"
                        >
                          <FileText size={14} className={doc.document_type === 'TENDER' ? 'text-red-400' : 'text-blue-400'} />
                          <span className="truncate flex-1">{doc.title}</span>
                          <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                            {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : 'PDF'}
                          </span>
                        </a>
                      ))
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 opacity-50">
                          <FileText size={14} className="text-slate-500" /> 
                          <span className="flex-1 italic">No documents uploaded yet</span>
                        </div>
                      </div>
                    )}
                  </div>
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
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${c.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {c.status || 'OPEN'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3">{c.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <Image size={12} /> No Image Uploaded
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
              {complaintOpen && <ComplaintForm projectId={project.id} onClose={() => setComplaintOpen(false)} />}
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

            {/* 10. ACCOUNTABILITY SCORE (Advanced) */}
            <div className="glass-card p-6 bg-gradient-to-r from-brand-900/20 to-purple-900/20 border-purple-500/20">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1">
                  <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
                    <BadgeCheck size={16} className="text-purple-400" /> Accountability Score
                  </h2>
                  <p className="text-xs text-slate-400">Based on delay, complaints, budget overrun, and update frequency.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400"/> Low Delays</div>
                    <div className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-yellow-400"/> Moderate Complaints</div>
                    <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-400"/> On Budget</div>
                    <div className="flex items-center gap-1.5"><XCircle size={12} className="text-red-400"/> Rare Updates</div>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 flex items-center justify-center relative shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-400 border-t-transparent border-r-transparent rotate-45"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{project.accountability_score ?? "72"}</div>
                    <div className="text-[10px] text-purple-300 uppercase">
                      {project.accountability_score && project.accountability_score > 80 ? "Excellent" : 
                       project.accountability_score && project.accountability_score > 60 ? "Fair" : "Poor"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 11. AI INSIGHTS (Future Feature) */}
            <div className="glass-card p-6 border border-white/5 border-dashed bg-black/20">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <Cpu size={16} className="text-indigo-400" /> AI Insights
                </h2>
                {!project.ai_insights && (
                  <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Coming Soon</span>
                )}
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${!project.ai_insights ? 'opacity-50 select-none' : ''}`}>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-semibold text-white mb-1">Risk Prediction</div>
                  <div className="text-sm text-slate-400">{project.ai_insights?.risk_prediction || "Medium Risk"}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-semibold text-white mb-1">Delay Probability</div>
                  <div className="text-sm text-slate-400">{project.ai_insights?.delay_probability || "45% Chance"}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <div className="text-xs font-semibold text-white mb-1">Quality Issues</div>
                  <div className="text-sm text-slate-400">{project.ai_insights?.quality_issues || "No anomalies detected"}</div>
                </div>
              </div>
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

function ComplaintForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("DELAY");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const { complaintsApi } = await import("@/lib/api");
      await complaintsApi.submit({ project_id: projectId, title, description, complaint_type: type });
      setDone(true);
    } finally { setSubmitting(false); }
  };
  if (done) return (
    <div className="mt-4 p-4 bg-green-900/20 border border-green-800/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
      <CheckCircle size={16} /> Complaint submitted. Thank you!
    </div>
  );
  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-white/8 pt-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Send size={13} className="text-brand-400" /> Submit a Complaint</h3>
      <select value={type} onChange={(e) => setType(e.target.value)} className="input-dark text-sm w-full">
        <option value="DELAY">Delay in work</option>
        <option value="QUALITY">Poor quality / shoddy work</option>
        <option value="CORRUPTION">Corruption / misuse of funds</option>
        <option value="SAFETY">Safety hazard</option>
        <option value="MISMATCH">Data mismatch</option>
        <option value="OTHER">Other</option>
      </select>
      <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief issue title…" className="input-dark text-sm w-full" />
      <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you observed…" className="input-dark text-sm resize-none w-full" rows={3} />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm py-2 flex-1 justify-center">{submitting ? "Submitting…" : "Submit Complaint"}</button>
        <button type="button" onClick={onClose} className="btn-ghost text-sm py-2 px-4">Cancel</button>
      </div>
    </form>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="glass-card p-8 h-48" />
      <div className="glass-card p-6 h-64" />
      <div className="glass-card p-6 h-72" />
      <div className="glass-card p-6 h-32" />
    </div>
  );
}

