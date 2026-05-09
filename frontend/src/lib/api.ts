import axios from "axios";
import type { ComplaintStatus, VerificationStatus } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// API methods

export const projectsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/projects", { params }),

  get: (id: string) =>
    api.get(`/projects/${id}`),

  updates: (id: string) =>
    api.get(`/projects/${id}/updates`),

  complaints: (id: string) =>
    api.get(`/projects/${id}/complaints`),

  documents: (id: string) =>
    api.get(`/projects/${id}/documents`),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${id}`, data),

  addDocument: (id: string, data: Record<string, unknown>) =>
    api.post(`/projects/${id}/documents`, data),

  uploadDocument: (id: string, data: FormData) =>
    api.post(`/projects/${id}/documents/upload`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const searchApi = {
  search: (params: Record<string, unknown>) =>
    api.get("/search", { params }),

  mapPins: (params?: Record<string, unknown>) =>
    api.get("/search/map", { params }),

  suggest: (q: string) =>
    api.get("/search/suggest", { params: { q } }),
};

export const analyticsApi = {
  summary: () => api.get("/analytics/summary"),
};

export const complaintsApi = {
  submit: (data: Record<string, unknown>) =>
    api.post("/complaints", data),

  uploadEvidence: (id: string, data: FormData) =>
    api.post(`/complaints/${id}/evidence`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  upvote: (id: string) =>
    api.post(`/complaints/${id}/upvote`),
};

export const partiesApi = {
  contractor: (id: string) =>
    api.get(`/contractors/${id}`),

  authority: (id: string) =>
    api.get(`/authorities/${id}`),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (data: Record<string, unknown>) =>
    api.post("/auth/register", data),

  me: () => api.get("/auth/me"),
};

export const adminApi = {
  stats: () => api.get("/admin/stats"),
  pendingComplaints: () => api.get("/admin/complaints/pending"),
  unverifiedProjects: () => api.get("/admin/projects/unverified"),
  runIngestion: (data: Record<string, unknown>) =>
    api.post("/admin/ingest/run-now", data, { timeout: 120000 }),
  verifyProject: (id: string, status: VerificationStatus) => 
    api.patch(`/projects/${id}/verify?verification_status=${status}`),
  moderateComplaint: (id: string, status: ComplaintStatus) =>
    api.patch(`/complaints/${id}/moderate?new_status=${status}`),
};
