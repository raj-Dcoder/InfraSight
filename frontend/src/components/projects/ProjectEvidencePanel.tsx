"use client";

import { AlertTriangle, CheckCircle, ExternalLink, FileText, Globe, Shield } from "lucide-react";
import { TrustBadge } from "@/components/ui/Badges";
import type { Document as ProjectDocument, ProjectDetail } from "@/types";
import { formatDate } from "@/lib/utils";

export function ProjectEvidencePanel({
  project,
  documents,
}: {
  project: ProjectDetail;
  documents: ProjectDocument[];
}) {
  const hasSource = Boolean(project.source_url);
  const hasDocuments = documents.length > 0;
  const hasComplaints = project.complaint_count > 0;
  const sourceHost = project.source_url ? getHostname(project.source_url) : null;

  return (
    <div className="glass-card p-6 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-semibold text-white text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
            <Shield size={16} className="text-green-400" /> Trust & Evidence
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Review the verification status, official sources, documents, and public reports behind this project record.
          </p>
        </div>
        <TrustBadge status={project.verification_status} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <TrustSignal
          label="Verification"
          value={project.verification_status.replace("_", " ")}
          active={project.verification_status === "VERIFIED" || project.verification_status === "COMMUNITY_VERIFIED"}
        />
        <TrustSignal label="Official Source" value={hasSource ? "Available" : "Missing"} active={hasSource} />
        <TrustSignal label="Documents" value={hasDocuments ? `${documents.length} uploaded` : "None yet"} active={hasDocuments} />
        <TrustSignal label="Public Reports" value={hasComplaints ? `${project.complaint_count} filed` : "None"} active={!hasComplaints} />
      </div>

      {(!hasSource || !hasDocuments || project.verification_status === "UNVERIFIED" || project.verification_status === "DISPUTED") && (
        <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 flex gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-yellow-200">Evidence needs review</div>
            <p className="text-xs text-yellow-100/70 mt-1">
              This record is still building its evidence trail. Treat figures as provisional until source links, documents, and verification are complete.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Source Record</div>
          {project.source_url ? (
            <a
              href={project.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 bg-blue-400/10 p-3 rounded-lg border border-blue-400/20 transition-colors"
            >
              <Globe size={14} />
              <span className="truncate flex-1">{sourceHost || "Open official source"}</span>
              <ExternalLink size={12} className="shrink-0 opacity-70" />
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/5 p-3 rounded-lg border border-white/5">
              <Globe size={14} className="opacity-40" />
              <span>Source link not added</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <EvidenceMeta label="Verified On" value={formatDate(project.verified_at)} />
            <EvidenceMeta label="Last Updated" value={formatDate(project.updated_at)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Supporting Documents</div>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url || doc.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/20 hover:bg-white/10 transition-colors group"
                >
                  <FileText size={14} className={doc.is_verified ? "text-green-400" : "text-blue-400"} />
                  <span className="truncate flex-1">{doc.title}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                    {doc.file_size_bytes ? `${Math.max(1, Math.round(doc.file_size_bytes / 1024))} KB` : doc.document_type || "Document"}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/5 p-3 rounded-lg border border-white/5">
              <FileText size={14} className="opacity-40" />
              <span>No documents uploaded yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustSignal({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        {active ? <CheckCircle size={13} className="text-green-400" /> : <AlertTriangle size={13} className="text-yellow-400" />}
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-sm font-medium text-white capitalize">{value.toLowerCase()}</div>
    </div>
  );
}

function EvidenceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-300">{value}</div>
    </div>
  );
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
