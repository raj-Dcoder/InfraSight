// Shared TypeScript types for InfraSight frontend

export type ProjectStatus =
  | "PLANNED"
  | "TENDERED"
  | "IN_PROGRESS"
  | "DELAYED"
  | "COMPLETED"
  | "ABANDONED"
  | "ON_HOLD";

export type ProjectCategory =
  | "ROAD"
  | "BRIDGE"
  | "BUILDING"
  | "WATER"
  | "SANITATION"
  | "ELECTRICITY"
  | "RAILWAY"
  | "METRO"
  | "PORT"
  | "AIRPORT"
  | "OTHER";

export type VerificationStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "COMMUNITY_VERIFIED"
  | "DISPUTED"
  | "RETRACTED";

export interface Contractor {
  id: string;
  canonical_name: string;
  registered_state?: string;
  registration_number?: string;
  gst_number?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  blacklisted: boolean;
  blacklist_reason?: string;
  aliases: string[];
  created_at: string;
}

export interface Authority {
  id: string;
  canonical_name: string;
  authority_type?: string;
  state?: string;
  district?: string;
  city?: string;
  website?: string;
  nodal_officer?: string;
  created_at: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  state: string;
  city?: string;
  district?: string;
  verification_status: VerificationStatus;
  physical_progress_pct?: number;
  sanctioned_budget_inr?: number;
  original_end_date?: string;
  revised_end_date?: string;
  contractor_name?: string;
  authority_name?: string;
  delay_days?: number;
  lat?: number;
  lng?: number;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  document_type?: string;
  file_url?: string;
  original_url?: string;
  file_size_bytes?: number;
  mime_type?: string;
  extracted_text?: string;
  doc_metadata: Record<string, any>;
  is_verified: boolean;
  created_at: string;
}

export interface ProjectDetail extends ProjectListItem {
  project_code?: string;
  description?: string;
  sub_category?: string;
  ward?: string;
  pincode?: string;
  address?: string;
  contractor?: Contractor;
  authority?: Authority;
  consultant_name?: string;
  supervisor_name?: string;
  revised_budget_inr?: number;
  expenditure_inr?: number;
  funding_source?: string;
  sanctioned_date?: string;
  start_date?: string;
  actual_completion_date?: string;
  delay_reason?: string;
  financial_progress_pct?: number;
  verified_at?: string;
  source_url?: string;
  location?: {
    lat: number;
    lng: number;
  };
  complaint_count: number;
  accountability_score?: number;
  ai_insights?: {
    risk_prediction?: string;
    delay_probability?: string;
    quality_issues?: string;
    [key: string]: any;
  };
  updated_at: string;
}

export interface Complaint {
  id: string;
  project_id: string;
  title: string;
  description: string;
  complaint_type?: string;
  status: string;
  evidence_urls: string[];
  upvotes: number;
  submitter_name?: string;
  created_at: string;
}

export interface MapPin {
  id: string;
  title: string;
  status: ProjectStatus;
  category: ProjectCategory;
  verification_status: VerificationStatus;
  lat: number;
  lng: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  results: T[];
}

export interface Stats {
  total_projects: number;
  verified_projects: number;
  delayed_projects: number;
  completed_projects: number;
  total_complaints: number;
  by_category: Record<string, number>;
}
