"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { analyticsApi } from "@/lib/api";
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";

function Counter({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export function HomeStats() {
  const { data, isLoading } = useSWR("public-stats", () => analyticsApi.summary().then(r => r.data));
  const stats = data?.totals;

  const displayStats = [
    { label: "Total Projects", value: stats?.total_projects ?? 0, color: "text-brand-400", icon: <TrendingUp size={18} /> },
    { label: "Delayed", value: stats?.delayed_projects ?? 0, color: "text-red-400", icon: <Clock size={18} /> },
    { label: "Completed", value: stats?.completed_projects ?? 0, color: "text-green-400", icon: <CheckCircle size={18} /> },
    { label: "Complaints", value: stats?.total_complaints ?? 0, color: "text-yellow-400", icon: <AlertTriangle size={18} /> },
  ];

  return (
    <section className="py-16 bg-surface-800-50 border-y border-slate-900/5 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-10 text-center"
        >
          Platform Statistics - Bhubaneswar Phase 1
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayStats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-5 text-center group hover:border-slate-900/20 dark:hover:border-white/20 transition-colors"
            >
              <div className={`flex justify-center mb-3 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div className="stat-number mb-1">
                {isLoading ? (
                  <div className="h-8 w-16 bg-slate-900/10 dark:bg-white/10 animate-pulse rounded mx-auto" />
                ) : (
                  <Counter value={stat.value} />
                )}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-500 font-medium group-hover:text-slate-300 transition-colors">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
