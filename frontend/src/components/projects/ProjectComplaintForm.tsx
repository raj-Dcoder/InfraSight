"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";

export function ProjectComplaintForm({
  projectId,
  onClose,
  onSubmitted,
}: {
  projectId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("DELAY");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);
    try {
      const { complaintsApi } = await import("@/lib/api");
      const response = await complaintsApi.submit({ project_id: projectId, title, description, complaint_type: type });
      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        await complaintsApi.uploadEvidence(response.data.id, formData);
      }
      onSubmitted();
      setDone(true);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const firstDetail = Array.isArray(detail) ? detail[0] : null;
      setErrorMessage(
        firstDetail?.msg ||
        error?.response?.data?.detail ||
        "Report could not be submitted. Check the fields and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 p-4 bg-green-900/20 border border-green-800/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
        <CheckCircle size={16} /> Complaint submitted. Thank you!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-white/8 pt-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Send size={13} className="text-brand-400" /> Submit a Complaint
      </h3>
      <select value={type} onChange={(e) => setType(e.target.value)} className="input-dark text-sm w-full">
        <option value="DELAY">Delay in work</option>
        <option value="QUALITY">Poor quality / shoddy work</option>
        <option value="CORRUPTION">Corruption / misuse of funds</option>
        <option value="SAFETY">Safety hazard</option>
        <option value="MISMATCH">Data mismatch</option>
        <option value="OTHER">Other</option>
      </select>
      <input required minLength={5} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief issue title..." className="input-dark text-sm w-full" />
      <textarea required minLength={20} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you observed in at least 20 characters..." className="input-dark text-sm resize-none w-full" rows={3} />
      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-500">Evidence photo, video, or PDF</span>
        <input
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-white/15"
        />
        {evidenceFile && (
          <span className="block text-xs text-slate-500">
            Selected: {evidenceFile.name}
          </span>
        )}
      </label>
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm py-2 flex-1 justify-center">{submitting ? "Submitting..." : "Submit Report"}</button>
        <button type="button" onClick={onClose} className="btn-ghost text-sm py-2 px-4">Cancel</button>
      </div>
    </form>
  );
}
