"use client";

import { useState } from "react";
import { X, Save, FilePlus, ExternalLink, Loader2, Plus, Upload } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import type { ProjectDetail } from "@/types";

interface Props {
  project: ProjectDetail;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProjectEditModal({ project, onClose, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description || "",
    status: project.status,
    source_url: project.source_url || "",
    physical_progress_pct: project.physical_progress_pct || 0,
  });

  const [docData, setDocData] = useState({
    title: "",
    document_type: "OTHER",
    file_url: "",
    original_url: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await projectsApi.update(project.id, formData);
      toast.success("Project updated successfully");
      onUpdate();
    } catch (err) {
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docData.title || (!docData.file_url && !docData.original_url && !docFile)) {
      toast.error("Please provide title and a file or URL");
      return;
    }
    setLoading(true);
    try {
      if (docFile) {
        const form = new FormData();
        form.append("title", docData.title);
        form.append("document_type", docData.document_type);
        form.append("file", docFile);
        await projectsApi.uploadDocument(project.id, form);
      } else {
        await projectsApi.addDocument(project.id, docData);
      }
      toast.success("Document added successfully");
      setDocData({ title: "", document_type: "OTHER", file_url: "", original_url: "" });
      setDocFile(null);
      onUpdate();
    } catch (err) {
      toast.error("Failed to add document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-900/10 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Project</h2>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">ID: {project.id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Data Form */}
          <form onSubmit={handleUpdateProject} className="space-y-6">
            <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">Project Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-dark w-full h-24 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="input-dark w-full"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="TENDERED">Tendered</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ABANDONED">Abandoned</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">Physical Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.physical_progress_pct}
                  onChange={(e) => setFormData({ ...formData, physical_progress_pct: parseInt(e.target.value) })}
                  className="input-dark w-full"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">Official Source URL</label>
                <div className="flex gap-2">
                  <input
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    placeholder="https://..."
                    className="input-dark flex-1"
                  />
                  {formData.source_url && (
                    <a href={formData.source_url} target="_blank" className="p-3 bg-slate-900/5 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-900/10 dark:border-white/10">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} className="mr-2" /> Save Changes</>}
            </button>
          </form>

          {/* Documents Section */}
          <div className="pt-8 border-t border-slate-900/10 dark:border-white/10">
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-6">Documents & Resources</h3>
            
            {/* Add Document Form */}
            <form onSubmit={handleAddDocument} className="bg-slate-900/5 dark:bg-white/5 border border-slate-900/5 dark:border-white/5 rounded-xl p-5 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase">Document Title</label>
                  <input
                    value={docData.title}
                    onChange={(e) => setDocData({ ...docData, title: e.target.value })}
                    placeholder="e.g. Work Order PDF"
                    className="input-dark w-full text-sm py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase">Type</label>
                  <select
                    value={docData.document_type}
                    onChange={(e) => setDocData({ ...docData, document_type: e.target.value })}
                    className="input-dark w-full text-sm py-2"
                  >
                    <option value="TENDER">Tender</option>
                    <option value="WORK_ORDER">Work Order</option>
                    <option value="AUDIT">Audit</option>
                    <option value="PHOTO">Photo</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase">Upload File</label>
                  <label className="input-dark w-full text-sm py-3 flex items-center gap-2 cursor-pointer">
                    <Upload size={14} />
                    <span className="truncate">{docFile ? docFile.name : "Choose PDF, image, or document"}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-slate-600 dark:text-slate-500 uppercase">Or External File URL</label>
                  <input
                    value={docData.file_url}
                    onChange={(e) => setDocData({ ...docData, file_url: e.target.value })}
                    placeholder="https://..."
                    className="input-dark w-full text-sm py-2"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-ghost w-full py-2 text-xs border-green-500/20 text-green-400 hover:bg-green-500/10">
                <Plus size={14} className="mr-1" /> Add Document
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
