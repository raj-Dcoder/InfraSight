"use client";
import Link from "next/link";
import { MapPin, Search, Menu, X, Activity, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    setIsLoggedIn(!!localStorage.getItem("access_token"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/projects?q=${encodeURIComponent(searchQuery)}`);
    setSearchQuery("");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-900/8 dark:border-white/8 bg-navbar backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-blue">
              <Activity size={16} className="text-slate-900 dark:text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              Infra<span className="text-brand-400">Sight</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/projects" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Projects
            </Link>
            <Link href="/map" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <MapPin size={14} />
              Map
            </Link>
            <Link href="/about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              About
            </Link>
            {isLoggedIn && (
              <Link href="/admin" className="text-sm text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5">
                <Shield size={14} />
                Dashboard
              </Link>
            )}
          </div>

          {/* Right side - Search + Login/Logout */}
          <div className="hidden md:flex items-center gap-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500/50 w-32 focus:w-48 transition-all"
              />
            </form>
            <ThemeToggle />
            {isLoggedIn ? (
              <button 
                onClick={handleLogout}
                className="btn-ghost text-xs py-1.5 px-4 flex items-center gap-2 border-slate-900/10 dark:border-white/10 hover:text-red-400 hover:border-red-400/30"
              >
                <LogOut size={14} />
                Logout
              </button>
            ) : (
              <Link href="/login" className="btn-primary text-xs py-1.5 px-4">
                Admin Login
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-900/8 dark:border-white/8 bg-mobile-menu px-4 py-4 space-y-3 animate-fade-in">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white"
            />
          </form>
          <Link href="/projects" className="block text-slate-700 dark:text-slate-300 py-2" onClick={() => setMobileOpen(false)}>Projects</Link>
          <Link href="/map" className="block text-slate-700 dark:text-slate-300 py-2" onClick={() => setMobileOpen(false)}>Map View</Link>
          <Link href="/about" className="block text-slate-700 dark:text-slate-300 py-2" onClick={() => setMobileOpen(false)}>About</Link>
          {isLoggedIn ? (
            <>
              <Link href="/admin" className="block text-brand-400 py-2 font-medium" onClick={() => setMobileOpen(false)}>Admin Dashboard</Link>
              <button 
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="btn-ghost text-sm w-full justify-center mt-2 border-slate-900/10 dark:border-white/10 text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm w-full justify-center mt-2" onClick={() => setMobileOpen(false)}>Admin Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}
