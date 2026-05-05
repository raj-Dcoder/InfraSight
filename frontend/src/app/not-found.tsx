"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Search, Home, ArrowLeft, Ghost } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="relative mb-8 inline-block">
            <Ghost size={120} className="text-brand-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-slate-900 dark:text-white">404</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Page Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-10">
            The project or page you are looking for doesn't exist or has been moved to another location.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/projects" className="btn-primary flex items-center justify-center gap-2 px-6">
              <Search size={18} /> Browse Projects
            </Link>
            <Link href="/" className="btn-ghost flex items-center justify-center gap-2 px-6 border-slate-900/10 dark:border-white/10">
              <Home size={18} /> Back to Home
            </Link>
          </div>
          
          <button 
            onClick={() => window.history.back()}
            className="mt-8 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
        </motion.div>
      </div>
    </div>
  );
}
