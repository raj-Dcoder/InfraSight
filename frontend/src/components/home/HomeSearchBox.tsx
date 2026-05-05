"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HomeSearchBox() {
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/projects?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/projects");
    }
  };

  const handleNearMe = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          router.push(`/projects?near_lat=${lat}&near_lng=${lng}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please check browser permissions.");
          setLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setLocating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xl">
      <motion.form 
        onSubmit={handleSearch} 
        animate={isFocused ? { scale: 1.02 } : { scale: 1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-brand-400' : 'text-slate-600 dark:text-slate-500'}`}
            size={16}
          />
          <input
            type="text"
            value={q}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, roads, bridgesâ€¦"
            className="input-dark pl-11 py-3 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <button type="submit" className="btn-primary py-3 px-6 justify-center whitespace-nowrap group">
          Explore
          <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.form>
      
      <div className="flex">
        <motion.button
          onClick={handleNearMe}
          disabled={locating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-ghost py-2 px-4 text-sm flex items-center gap-2 border border-slate-900/10 dark:border-white/10 hover:border-brand-500/50 hover:bg-brand-900/20 group relative overflow-hidden"
        >
          <MapPin size={14} className={`transition-colors ${locating ? 'animate-bounce text-brand-400' : 'text-brand-400 group-hover:text-brand-300'}`} />
          <span className="relative z-10">{locating ? "Locating..." : "Find Projects Near Me"}</span>
          {locating && (
            <motion.div 
              className="absolute inset-0 bg-brand-500/10"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
