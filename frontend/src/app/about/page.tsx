"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Shield, Users, Database, Eye, Globe, Github, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutPage() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-700 dark:text-slate-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden border-b border-slate-900/5 dark:border-white/5">
        <div className="absolute inset-0 bg-hero-gradient opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div {...fadeIn} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white mb-6">
              Helping Citizens Track <br />
              <span className="text-brand-400">Public Works</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              InfraSight is an open-source platform for collecting infrastructure records, source links,
              documents, and citizen reports into one easier-to-review public view.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Mission */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <Shield className="text-brand-400" /> Our Mission
            </h2>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                In many regions, public infrastructure data is scattered across fragmented portals, 
                making it difficult for the average citizen to understand what's happening in their neighborhood.
              </p>
              <p>
                InfraSight brings available records into a single, interactive platform. We believe clearer
                public information can help citizens, journalists, and administrators ask better questions.
              </p>
            </div>
          </motion.div>
          <motion.div {...fadeIn} className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Source</div>
              <div className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider">Linked</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-brand-400 mb-1">Open</div>
              <div className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider">Source</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Tracked</div>
              <div className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider">Updates</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">Civic</div>
              <div className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider">Driven</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface-900-50 border-y border-slate-900/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">How it works</h2>
            <p className="text-slate-600 dark:text-slate-500">The technology and processes behind InfraSight.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8">
              <Database className="text-brand-400 mb-6" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Data Ingestion</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Scoped import tools collect tender notices, work orders, and progress records from connected
                sources when those sources are available.
              </p>
            </div>
            <div className="glass-card p-8">
              <Eye className="text-purple-400 mb-6" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Verification</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Records can be reviewed against source links, uploaded documents, public reports, and admin
                verification status. Unverified records remain clearly marked.
              </p>
            </div>
            <div className="glass-card p-8">
              <Users className="text-green-400 mb-6" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Citizen Feedback</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We provide tools for citizens to report delays, quality issues, or safety hazards 
                directly to the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="py-24 text-center max-w-3xl mx-auto px-4">
        <motion.div {...fadeIn}>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-center gap-3">
            <Heart className="text-red-500 fill-red-500" /> Built for the Community
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
            InfraSight is a non-profit initiative. We are always looking for volunteers, 
            data enthusiasts, and civic-tech developers to help us expand to more cities.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="https://github.com" className="btn-ghost flex items-center gap-2 border-slate-900/10 dark:border-white/10 px-6 py-3">
              <Github size={20} /> View on GitHub
            </Link>
            <Link href="/projects" className="btn-primary px-8 py-3">
              Explore Projects
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 border-t border-slate-900/5 dark:border-white/5 text-center">
        <p className="text-sm text-slate-600">
          InfraSight &copy; 2026 &bull; Made with pride for Bhubaneswar, Odisha.
        </p>
      </footer>
    </div>
  );
}
