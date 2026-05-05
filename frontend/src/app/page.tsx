"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  Search, MapPin, Shield, TrendingUp, Clock, Users,
  ChevronRight, Activity, ArrowRight, Eye, FileSearch,
  AlertTriangle, Landmark, HardHat, CheckCircle,
} from "lucide-react";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeSearchBox } from "@/components/home/HomeSearchBox";
import { motion } from "framer-motion";

const HOW_STEPS = [
  {
    icon: <FileSearch size={22} className="text-brand-400" />,
    title: "Search any project",
    desc: "Type the name of a road, bridge, flyover, hospital, or drain near you. Get instant results with verified government data.",
    step: "01",
    color: "brand",
  },
  {
    icon: <Eye size={22} className="text-purple-400" />,
    title: "See all the details",
    desc: "View budget allocated, money spent, contractor name, responsible authority, and the full project timeline â€” all in one place.",
    step: "02",
    color: "purple",
  },
  {
    icon: <Shield size={22} className="text-green-400" />,
    title: "Trust the data",
    desc: "Every record is tagged with its source and verification status. Community-verified, government-verified, or disputed â€” you'll always know.",
    step: "03",
    color: "green",
  },
  {
    icon: <AlertTriangle size={22} className="text-yellow-400" />,
    title: "Report an issue",
    desc: "See poor quality work, corruption, or a delay? Submit a complaint directly on the project page. Every report is timestamped and public.",
    step: "04",
    color: "yellow",
  },
];

const CATEGORIES = [
  { icon: "ðŸ›£ï¸", label: "Roads",        cat: "ROAD"       },
  { icon: "ðŸŒ‰", label: "Bridges",      cat: "BRIDGE"     },
  { icon: "ðŸ¢", label: "Buildings",    cat: "BUILDING"   },
  { icon: "ðŸ’§", label: "Water",        cat: "WATER"      },
  { icon: "âš¡", label: "Electricity",  cat: "ELECTRICITY"},
  { icon: "ðŸš¿", label: "Sanitation",   cat: "SANITATION" },
  { icon: "ðŸš‡", label: "Metro",        cat: "METRO"      },
  { icon: "ðŸ—ï¸", label: "Other",       cat: "OTHER"      },
];

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-600/15 blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 60, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 right-10 w-72 h-72 rounded-full bg-purple-600/8 blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              x: [0, 20, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 left-1/2 w-96 h-48 rounded-full bg-brand-900/25 blur-3xl" 
          />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div 
              variants={fadeIn}
              className="inline-flex items-center gap-2 bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
            >
              <Activity size={12} className="animate-pulse-slow" />
              Phase 1 Live â€” Bhubaneswar, Odisha
            </motion.div>

            <motion.h1 
              variants={fadeIn}
              className="font-display text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-5"
            >
              Know exactly where your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
                tax money
              </span>{" "}
              is going.
            </motion.h1>

            <motion.p 
              variants={fadeIn}
              className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-10 max-w-2xl"
            >
              Search any road, bridge, flyover, or public building near you. See who built it, how much was allocated, 
              how much has been spent, and whether it's delayed â€” all from verified government data.
            </motion.p>

            <motion.div variants={fadeIn}>
              <HomeSearchBox />
            </motion.div>

            {/* Quick pills */}
            <motion.div variants={fadeIn} className="flex flex-wrap gap-2 mt-6">
              {["Khandagiri Flyover", "Capital Hospital", "BRTS Corridor", "Ekamra Heritage"].map((q) => (
                <Link
                  key={q}
                  href={`/projects?q=${encodeURIComponent(q)}`}
                  className="tag-pill hover:border-brand-500/40 hover:text-brand-300 transition-colors cursor-pointer"
                >
                  {q}
                </Link>
              ))}
            </motion.div>

            <motion.div variants={fadeIn} className="flex flex-wrap gap-6 mt-10 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Projects tracked
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Delayed projects flagged
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                Data updated daily
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ Stats â”€â”€ */}
      <HomeStats />

      {/* â”€â”€ Browse by Category â”€â”€ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-3">Browse by Project Type</h2>
          <p className="text-slate-600 dark:text-slate-400">Find infrastructure projects in your area by category.</p>
        </motion.div>
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-4 sm:grid-cols-8 gap-3"
        >
          {CATEGORIES.map((c) => (
            <motion.div key={c.cat} variants={fadeIn}>
              <Link
                href={`/projects?category=${c.cat}`}
                className="glass-card glass-card-hover p-4 flex flex-col items-center gap-2 text-center group h-full"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{c.icon}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-medium">{c.label}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* â”€â”€ How It Works â”€â”€ */}
      <section className="py-20 bg-surface-800-40 border-y border-slate-900/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-3">How InfraSight Works</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              From raw government data to a single transparent view â€” in four simple steps.
            </p>
          </motion.div>
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {HOW_STEPS.map((item) => (
              <motion.div 
                key={item.step} 
                variants={fadeIn}
                className="glass-card p-6 relative overflow-hidden group hover:border-brand-500/30 transition-colors"
              >
                <span className="absolute top-3 right-4 font-mono text-6xl font-bold text-slate-900/4 dark:text-white/4 group-hover:text-white/8 transition-colors">
                  {item.step}
                </span>
                <div className="mb-4 transform group-hover:-translate-y-1 transition-transform duration-300">{item.icon}</div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ Who is this for â”€â”€ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-3">Who uses InfraSight?</h2>
        </motion.div>
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {[
            {
              icon: <Users size={24} className="text-brand-400" />,
              title: "Citizens",
              desc: "Know what's being built near your home, who's responsible, and whether deadlines are being met. Report issues directly.",
            },
            {
              icon: <Landmark size={24} className="text-purple-400" />,
              title: "Journalists & RTI Activists",
              desc: "Access contractor names, budget revisions, and audit flags. Bulk data export for investigative stories.",
            },
            {
              icon: <HardHat size={24} className="text-yellow-400" />,
              title: "Watchdog Organizations",
              desc: "Track project delays, cost overruns, and blacklisted contractors across districts and states.",
            },
          ].map((u) => (
            <motion.div key={u.title} variants={fadeIn} className="glass-card p-7 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors">
              <div className="mb-4">{u.icon}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-lg">{u.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{u.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* â”€â”€ CTA â”€â”€ */}
      <section className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-12 text-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/30 to-purple-900/10 pointer-events-none group-hover:opacity-70 transition-opacity" />
          <div className="relative">
            <CheckCircle size={36} className="text-brand-400 mx-auto mb-4 animate-bounce-slow" />
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Start exploring projects near you
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Currently tracking Bhubaneswar. New cities and states added every month.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/projects" className="btn-primary inline-flex">
                Browse All Projects <ChevronRight size={16} />
              </Link>
              <Link href="/projects?view=map" className="btn-ghost inline-flex items-center gap-2">
                <MapPin size={15} /> View on Map
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-slate-900/8 dark:border-white/8 py-8 text-center text-sm text-slate-600">
        InfraSight â€” Built for public accountability &bull; Phase 1: Bhubaneswar &bull; Data sourced from official government portals
      </footer>
    </div>
  );
}
