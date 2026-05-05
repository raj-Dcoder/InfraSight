"use client";

import Link from "next/link";
import type { ProjectListItem } from "@/types";
import {
  StatusBadge, TrustBadge, CategoryChip, ProgressBar, DelayChip,
} from "@/components/ui/Badges";
import { formatINR, formatDate } from "@/lib/utils";
import {
  MapPin, Calendar, Building2, HardHat, ArrowRight, IndianRupee,
} from "lucide-react";
import { motion } from "framer-motion";

interface ProjectCardProps {
  project: ProjectListItem;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const catKey = project.category.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/projects/${project.id}`} className="block group h-full">
        <article className="glass-card glass-card-hover h-full flex flex-col relative overflow-hidden">
          {/* Category color strip */}
          <div className={`absolute top-0 left-0 w-full h-1 cat-${catKey}`} />

          <div className="p-5 flex flex-col h-full gap-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mt-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-brand-300 transition-colors">
                  {project.title}
                </h3>
              </div>
              <ArrowRight
                size={14}
                className="text-slate-600 group-hover:text-brand-400 mt-0.5 shrink-0 transition-transform group-hover:translate-x-1"
              />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={project.status} />
              <CategoryChip category={project.category} />
              {project.delay_days && project.delay_days > 0 && (
                <DelayChip delayDays={project.delay_days} />
              )}
            </div>

            {/* Progress */}
            {project.physical_progress_pct != null && (
              <ProgressBar
                value={project.physical_progress_pct}
                status={project.status}
                label="Physical Progress"
              />
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs mt-1">
              {/* Location */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2 sm:col-span-1">
                <MapPin size={12} className="text-brand-400/80 shrink-0" />
                <span className="truncate">
                  {project.city ? `${project.city}, ` : ""}{project.state}
                </span>
              </div>

              {/* Budget */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2 sm:col-span-1">
                <IndianRupee size={12} className="text-yellow-400/80 shrink-0" />
                <span className="truncate">{formatINR(project.sanctioned_budget_inr)}</span>
              </div>

              {/* Authority */}
              {project.authority_name && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2 truncate">
                  <Building2 size={12} className="text-blue-400/80 shrink-0" />
                  <span className="truncate">{project.authority_name}</span>
                </div>
              )}

              {/* Contractor */}
              {project.contractor_name && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2 truncate">
                  <HardHat size={12} className="text-yellow-400/80 shrink-0" />
                  <span className="truncate">{project.contractor_name}</span>
                </div>
              )}

              {/* Timeline */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2">
                <Calendar size={12} className="text-purple-400/80 shrink-0" />
                <span>
                  Due: {formatDate(project.revised_end_date ?? project.original_end_date)}
                </span>
              </div>
            </div>

            {/* Trust footer */}
            <div className="mt-auto pt-4 border-t border-slate-900/5 dark:border-white/5">
              <TrustBadge status={project.verification_status} />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
