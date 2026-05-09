"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ui/Badges";
import { ProjectMap } from "@/components/map/ProjectMap";
import { projectsApi, searchApi } from "@/lib/api";
import type { ProjectListItem, MapPin, PaginatedResponse, ProjectCategory, ProjectStatus, VerificationStatus } from "@/types";
import {
  Search,
  Map,
  Grid,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { CATEGORY_LABELS, STATUS_LABELS, TRUST_LABELS } from "@/lib/utils";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProjectCategory[];
const STATUSES = Object.keys(STATUS_LABELS) as ProjectStatus[];
const VERIFICATION_STATUSES = Object.keys(TRUST_LABELS) as VerificationStatus[];
const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first", sort_by: "created_at", sort_dir: "desc" },
  { value: "sanctioned_budget_inr:desc", label: "Budget: high to low", sort_by: "sanctioned_budget_inr", sort_dir: "desc" },
  { value: "sanctioned_budget_inr:asc", label: "Budget: low to high", sort_by: "sanctioned_budget_inr", sort_dir: "asc" },
  { value: "physical_progress_pct:desc", label: "Progress: high to low", sort_by: "physical_progress_pct", sort_dir: "desc" },
  { value: "title:asc", label: "Title: A to Z", sort_by: "title", sort_dir: "asc" },
] as const;
type SortOptionValue = (typeof SORT_OPTIONS)[number]["value"];

function getSortOption(value: string | null) {
  return SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0];
}

function getSortOptionValue(value: string): SortOptionValue {
  return getSortOption(value).value;
}

import { Suspense } from "react";

function normalizeProjectsResponse(payload: unknown, requestedPage: number, pageSize: number): PaginatedResponse<ProjectListItem> {
  if (Array.isArray(payload)) {
    return {
      total: payload.length,
      page: requestedPage,
      page_size: pageSize,
      pages: Math.max(1, Math.ceil(payload.length / pageSize)),
      results: payload as ProjectListItem[],
    };
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const nestedData =
      record.data && typeof record.data === "object"
        ? (record.data as Record<string, unknown>)
        : null;

    const results =
      (Array.isArray(record.results) && record.results) ||
      (Array.isArray(record.items) && record.items) ||
      (nestedData && Array.isArray(nestedData.results) && nestedData.results) ||
      (nestedData && Array.isArray(nestedData.items) && nestedData.items) ||
      [];

    return {
      total: Number(record.total ?? nestedData?.total ?? results.length),
      page: Number(record.page ?? nestedData?.page ?? requestedPage),
      page_size: Number(record.page_size ?? nestedData?.page_size ?? pageSize),
      pages: Number(record.pages ?? nestedData?.pages ?? Math.max(1, Math.ceil(results.length / pageSize))),
      results: results as ProjectListItem[],
    };
  }

  return {
    total: 0,
    page: requestedPage,
    page_size: pageSize,
    pages: 1,
    results: [],
  };
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [state, setState] = useState(searchParams.get("state") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [verificationStatus, setVerificationStatus] = useState(searchParams.get("verification") ?? "");
  const [minBudget, setMinBudget] = useState(searchParams.get("min_budget") ?? "");
  const [maxBudget, setMaxBudget] = useState(searchParams.get("max_budget") ?? "");
  const [sortOption, setSortOption] = useState<SortOptionValue>(getSortOption(searchParams.get("sort")).value);
  const [delayedOnly, setDelayedOnly] = useState(searchParams.get("delayed") === "1");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [nearLat, setNearLat] = useState<number | null>(searchParams.get("near_lat") ? Number(searchParams.get("near_lat")) : null);
  const [nearLng, setNearLng] = useState<number | null>(searchParams.get("near_lng") ? Number(searchParams.get("near_lng")) : null);

  // Update local state when URL params change
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setState(searchParams.get("state") ?? "");
    setCity(searchParams.get("city") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setStatus(searchParams.get("status") ?? "");
    setVerificationStatus(searchParams.get("verification") ?? "");
    setMinBudget(searchParams.get("min_budget") ?? "");
    setMaxBudget(searchParams.get("max_budget") ?? "");
    setSortOption(getSortOption(searchParams.get("sort")).value);
    setDelayedOnly(searchParams.get("delayed") === "1");
    setPage(Number(searchParams.get("page") ?? "1"));
    setNearLat(searchParams.get("near_lat") ? Number(searchParams.get("near_lat")) : null);
    setNearLng(searchParams.get("near_lng") ? Number(searchParams.get("near_lng")) : null);
  }, [searchParams]);

  // Sync URL with state
  const syncUrl = useCallback(() => {
    const newParams = new URLSearchParams();
    if (q) newParams.set("q", q);
    if (state) newParams.set("state", state);
    if (city) newParams.set("city", city);
    if (category) newParams.set("category", category);
    if (status) newParams.set("status", status);
    if (verificationStatus) newParams.set("verification", verificationStatus);
    if (minBudget) newParams.set("min_budget", minBudget);
    if (maxBudget) newParams.set("max_budget", maxBudget);
    if (sortOption !== SORT_OPTIONS[0].value) newParams.set("sort", sortOption);
    if (delayedOnly) newParams.set("delayed", "1");
    if (page > 1) newParams.set("page", page.toString());
    if (nearLat) newParams.set("near_lat", nearLat.toString());
    if (nearLng) newParams.set("near_lng", nearLng.toString());

    router.push(`/projects?${newParams.toString()}`);
  }, [q, state, city, category, status, verificationStatus, minBudget, maxBudget, sortOption, delayedOnly, page, nearLat, nearLng, router]);

  const handleSearch = useCallback(() => {
    setPage(1);
    syncUrl();
  }, [syncUrl]);

  // Auto-sync for filter/page changes
  useEffect(() => {
    syncUrl();
  }, [page, category, status, verificationStatus, minBudget, maxBudget, sortOption, delayedOnly, syncUrl]);

  // Build query params for API
  const selectedSort = getSortOption(sortOption);
  const minBudgetValue = minBudget ? Number(minBudget) : null;
  const maxBudgetValue = maxBudget ? Number(maxBudget) : null;
  const params = {
    ...(q && { q }),
    ...(state && { state }),
    ...(city && { city }),
    ...(category && { category }),
    ...(status && { status }),
    ...(verificationStatus && { verification_status: verificationStatus }),
    ...(minBudgetValue !== null && !Number.isNaN(minBudgetValue) && { min_budget: minBudgetValue }),
    ...(maxBudgetValue !== null && !Number.isNaN(maxBudgetValue) && { max_budget: maxBudgetValue }),
    ...(delayedOnly && { delayed_only: true }),
    ...(nearLat && nearLng && { near_lat: nearLat, near_lng: nearLng }),
    sort_by: selectedSort.sort_by,
    sort_dir: selectedSort.sort_dir,
    page,
    page_size: 12,
  };

  const usesSearchEndpoint = Boolean(q || nearLat || nearLng);

  // Fetch project list
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ProjectListItem>>(
    ["projects", params, usesSearchEndpoint],
    async () => {
      const response = usesSearchEndpoint
        ? await searchApi.search(params)
        : await projectsApi.list(params);

      return normalizeProjectsResponse(response.data, page, params.page_size);
    },
    { keepPreviousData: true }
  );

  // Fetch map pins
  const { data: pinsData } = useSWR<MapPin[]>(
    viewMode === "map" ? ["map-pins", state, city, category, status, verificationStatus, delayedOnly, nearLat, nearLng] : null,
    () => searchApi.mapPins({
      state: state || undefined,
      city: city || undefined,
      category: category || undefined,
      status: status || undefined,
      verification_status: verificationStatus || undefined,
      delayed_only: delayedOnly || undefined,
      near_lat: nearLat,
      near_lng: nearLng,
    }).then((r) => r.data),
    { keepPreviousData: true }
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Infrastructure Projects
            </h1>
            <p className="text-slate-600 dark:text-slate-500 text-sm mt-1">
              {error
                ? "Unable to load projects"
                : data
                  ? `${data.total.toLocaleString()} projects found`
                  : "Loading..."}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2 glass-card p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-brand-600 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "map" ? "bg-brand-600 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Map view"
            >
              <Map size={16} />
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="glass-card p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            {/* Search input */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-500" size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search projects..."
                className="input-dark pl-9 py-2 text-sm"
              />
            </div>

            {/* State */}
            <input
              value={state}
              onChange={(e) => { setState(e.target.value); setPage(1); }}
              placeholder="State"
              className="input-dark py-2 text-sm w-32"
            />

            {/* City */}
            <input
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
              placeholder="City"
              className="input-dark py-2 text-sm w-36"
            />

            {/* Filters toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`btn-ghost text-sm flex items-center gap-2 py-2 ${
                filtersOpen ? "border-brand-500 text-brand-400" : ""
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(category || status || verificationStatus || minBudget || maxBudget || sortOption !== SORT_OPTIONS[0].value || delayedOnly || nearLat) && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </button>

            <button
              onClick={handleSearch}
              className="btn-primary text-sm py-2 px-5"
            >
              <Search size={14} />
              Search
            </button>
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="mt-4 pt-4 border-t border-slate-900/8 dark:border-white/8 flex flex-wrap gap-4 animate-fade-in">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-500 block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="input-dark py-2 text-sm w-40"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-500 block mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="input-dark py-2 text-sm w-40"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Verification */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-500 block mb-1.5">Verification</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => { setVerificationStatus(e.target.value); setPage(1); }}
                  className="input-dark py-2 text-sm w-44"
                >
                  <option value="">All trust states</option>
                  {VERIFICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{TRUST_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Budget range */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-500 block mb-1.5">Budget range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minBudget}
                    onChange={(e) => { setMinBudget(e.target.value); setPage(1); }}
                    placeholder="Min INR"
                    className="input-dark py-2 text-sm w-28"
                  />
                  <input
                    type="number"
                    min="0"
                    value={maxBudget}
                    onChange={(e) => { setMaxBudget(e.target.value); setPage(1); }}
                    placeholder="Max INR"
                    className="input-dark py-2 text-sm w-28"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-500 block mb-1.5">Sort by</label>
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(getSortOptionValue(e.target.value)); setPage(1); }}
                  className="input-dark py-2 text-sm w-48"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Delayed only */}
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={delayedOnly}
                    onChange={(e) => { setDelayedOnly(e.target.checked); setPage(1); }}
                    className="accent-brand-500"
                  />
                  Delayed only
                </label>
              </div>

              {/* Clear */}
              <div className="flex flex-col justify-end pb-1 gap-2">
                {nearLat && nearLng && (
                  <div className="flex items-center gap-2 text-xs text-brand-300 bg-brand-900/40 px-3 py-1.5 rounded-full border border-brand-500/30 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                    Near Me active
                    <button onClick={() => { setNearLat(null); setNearLng(null); setPage(1); }} className="hover:text-slate-900 dark:hover:text-white ml-1">&times;</button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setCategory(""); setStatus(""); setDelayedOnly(false);
                    setVerificationStatus(""); setMinBudget(""); setMaxBudget("");
                    setSortOption(SORT_OPTIONS[0].value);
                    setQ(""); setState(""); setCity(""); setPage(1);
                    setNearLat(null); setNearLng(null);
                  }}
                  className="text-xs text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white underline text-left"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)
                : data?.results.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
            </div>

            {!isLoading && error && (
              <div className="glass-card p-8 text-center border border-red-500/20">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Projects could not be loaded</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  The project list request failed. Try again or clear the current filters.
                </p>
                <button
                  onClick={() => mutate()}
                  className="btn-primary text-sm py-2 px-5"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && data && data.results.length === 0 && (
              <div className="glass-card p-8 text-center">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No projects found</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Try a broader search or remove some filters to see more projects.
                </p>
              </div>
            )}

            {/* Pagination */}
            {data && !error && data.pages > 1 && (
              <div className="flex justify-center items-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn-ghost py-2 px-3 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} of {data.pages}
                </span>
                <button
                  disabled={page >= data.pages}
                  onClick={() => setPage(page + 1)}
                  className="btn-ghost py-2 px-3 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Map view */
          <div className="h-[calc(100vh-280px)] min-h-96 rounded-xl overflow-hidden border border-slate-900/8 dark:border-white/8">
            <ProjectMap
              pins={pinsData ?? []}
              className="h-full"
              userLocation={nearLat && nearLng ? { lat: nearLat, lng: nearLng } : null}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-900 flex items-center justify-center text-slate-600 dark:text-slate-500">Loading projects...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
