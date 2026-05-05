"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { adminApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  FileText,
  Clock,
  ThumbsUp,
  Ban,
  Loader2,
  Edit3,
  Search as SearchIcon,
  ExternalLink
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProjectEditModal } from "@/components/admin/ProjectEditModal";
import { projectsApi } from "@/lib/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"stats" | "complaints" | "verify" | "manage">("stats");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const { data: stats } = useSWR(isAuthorized ? "admin-stats" : null, () => adminApi.stats().then(r => r.data));
  const { data: complaints } = useSWR(isAuthorized ? "admin-complaints" : null, () => adminApi.pendingComplaints().then(r => r.data));
  const { data: unverifiedProjects } = useSWR(isAuthorized ? "admin-projects" : null, () => adminApi.unverifiedProjects().then(r => r.data));
  
  const { data: allProjectsData, mutate: refreshAll } = useSWR(
    isAuthorized && activeTab === "manage" ? ["admin-all-projects", searchQuery] : null,
    () => projectsApi.list({ q: searchQuery, page_size: 50 }).then(r => r.data)
  );

  const handleModerate = async (id: string, status: string) => {
    try {
      await adminApi.moderateComplaint(id, status);
      mutate("admin-complaints");
      toast.success(`Complaint marked as ${status.toLowerCase()}`);
    } catch (e) {
      toast.error("Failed to moderate complaint");
    }
  };

  const handleVerify = async (id: string, status: string) => {
    try {
      await adminApi.verifyProject(id, status);
      mutate("admin-projects");
      toast.success(`Project verification set to ${status.toLowerCase()}`);
    } catch (e) {
      toast.error("Failed to verify project");
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await projectsApi.get(id);
      setEditingProject(res.data);
    } catch (err) {
      toast.error("Failed to load project details");
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400">
        <Loader2 className="animate-spin mb-4 text-brand-500" size={32} />
        <p className="animate-pulse">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="text-brand-400" size={28} />
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-900/10 dark:border-white/10 mb-6 overflow-x-auto">
          {(["stats", "complaints", "verify", "manage"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab 
                  ? "border-brand-400 text-brand-400" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab === "stats" && "Platform Stats"}
              {tab === "complaints" && `Complaints (${complaints?.length || 0})`}
              {tab === "verify" && `Queue (${unverifiedProjects?.length || 0})`}
              {tab === "manage" && "Manage Projects"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            <StatCard icon={<FileText />} label="Total Projects" value={stats?.total_projects} />
            <StatCard icon={<CheckCircle2 />} label="Verified Projects" value={stats?.verified_projects} />
            <StatCard icon={<AlertTriangle />} label="Delayed Projects" value={stats?.delayed_projects} />
            <StatCard icon={<Activity />} label="Total Complaints" value={stats?.total_complaints} />
            
            {stats?.by_category && (
              <div className="col-span-full lg:col-span-2 glass-card p-6 mt-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Projects by Category</h3>
                <div className="space-y-3">
                  {Object.entries(stats.by_category).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{cat}</span>
                      <span className="text-sm text-slate-900 dark:text-white font-medium">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "complaints" && (
          <div className="space-y-4 animate-fade-in">
            {!complaints?.length ? (
              <p className="text-slate-600 dark:text-slate-500">No pending complaints.</p>
            ) : (
              complaints.map((c: any) => (
                <div key={c.id} className="glass-card p-5 border-l-4 border-brand-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-900 dark:text-white font-medium">{c.title}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleModerate(c.id, "REVIEWED")} className="btn-ghost py-1 px-3 text-xs text-green-400 hover:bg-green-400/10 hover:border-green-400/30">
                        <CheckCircle2 size={14} className="mr-1" inline /> Approve
                      </button>
                      <button onClick={() => handleModerate(c.id, "REJECTED")} className="btn-ghost py-1 px-3 text-xs text-red-400 hover:bg-red-400/10 hover:border-red-400/30">
                        <Ban size={14} className="mr-1" inline /> Reject
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{c.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12}/> {formatDate(c.created_at)}</span>
                    {c.is_spam && <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Spam Detected (Score: {c.spam_score})</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "verify" && (
          <div className="space-y-4 animate-fade-in">
            {!unverifiedProjects?.length ? (
              <p className="text-slate-600 dark:text-slate-500">No projects in verification queue.</p>
            ) : (
              unverifiedProjects.map((p: any) => (
                <div key={p.id} className="glass-card p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-medium">{p.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-slate-600 dark:text-slate-500 bg-slate-900/5 dark:bg-white/5 px-2 py-0.5 rounded">{p.category}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-500 bg-slate-900/5 dark:bg-white/5 px-2 py-0.5 rounded">{p.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(p.id, "VERIFIED")} className="btn-ghost py-1 px-3 text-xs text-green-400 hover:bg-green-400/10 hover:border-green-400/30">
                        <CheckCircle2 size={14} className="mr-1" inline /> Verify Match
                      </button>
                      <button onClick={() => handleVerify(p.id, "FLAGGED")} className="btn-ghost py-1 px-3 text-xs text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/30">
                        <AlertTriangle size={14} className="mr-1" inline /> Flag Mismatch
                      </button>
                      <button onClick={() => handleEdit(p.id)} className="btn-ghost py-1 px-3 text-xs text-brand-400 hover:bg-brand-400/10 hover:border-brand-400/30">
                        <Edit3 size={14} className="mr-1" inline /> Edit
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-500 mt-4">
                    <Link href={`/projects/${p.id}`} className="text-brand-400 hover:underline">View Local Page</Link>
                    {p.source_url && <a href={p.source_url} target="_blank" className="text-brand-400 hover:underline">Verify Source Data â†—</a>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "manage" && (
          <div className="space-y-6 animate-fade-in">
            {/* Search Box */}
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-500" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects to edit..."
                className="input-dark pl-12 py-3 w-full"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allProjectsData?.results.map((p: any) => (
                <div key={p.id} className="glass-card p-4 flex items-center justify-between gap-4 group">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-slate-900 dark:text-white font-medium truncate">{p.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-500 mt-1">
                      <span>{p.city}, {p.state}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>{p.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/projects/${p.id}`} target="_blank" className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <ExternalLink size={18} />
                    </Link>
                    <button onClick={() => handleEdit(p.id)} className="p-2 text-brand-400 hover:text-brand-300 transition-colors">
                      <Edit3 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingProject && (
          <ProjectEditModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onUpdate={() => {
              setEditingProject(null);
              mutate("admin-projects");
              refreshAll();
            }}
          />
        )}

      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value?: number }) {
  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div className="p-3 bg-brand-500/20 text-brand-400 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value !== undefined ? value : "â€”"}</p>
      </div>
    </div>
  );
}
