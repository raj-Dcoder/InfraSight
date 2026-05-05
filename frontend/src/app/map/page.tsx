"use client";

import { useState, Suspense } from "react";
import useSWR from "swr";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectMap } from "@/components/map/ProjectMap";
import { searchApi } from "@/lib/api";
import type { MapPin } from "@/types";
import { 
  Map as MapIcon, 
  Layers, 
  Filter, 
  Navigation,
  Info,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function MapContent() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  
  // Fetch all pins for the map
  const { data: pins = [], isLoading } = useSWR<MapPin[]>(
    "all-map-pins",
    () => searchApi.mapPins().then(r => r.data)
  );

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-950">
      <Navbar />
      
      <div className="flex-1 relative">
        {/* Full screen Map */}
        <ProjectMap 
          pins={pins} 
          className="h-full w-full" 
          userLocation={userLoc}
        />

        {/* Overlay UI: Top Left (Stats) */}
        <div className="absolute top-6 left-6 z-[40] pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4 backdrop-blur-md bg-surface-900-60 border-slate-900/10 dark:border-white/10 pointer-events-auto"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg">
                <MapIcon size={20} />
              </div>
              <div>
                <h1 className="text-slate-900 dark:text-white font-bold text-sm">Interactive Map</h1>
                <p className="text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Bhubaneswar Live</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 rounded-lg bg-slate-900/5 dark:bg-white/5 border border-slate-900/5 dark:border-white/5">
                <div className="text-slate-900 dark:text-white font-bold text-lg leading-none">{pins.length}</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-500 mt-1 uppercase">Pins</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-900/5 dark:bg-white/5 border border-slate-900/5 dark:border-white/5">
                <div className="text-brand-400 font-bold text-lg leading-none">
                  {pins.filter(p => p.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-500 mt-1 uppercase">Active</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Overlay UI: Top Right (Controls) */}
        <div className="absolute top-6 right-6 z-[40] flex flex-col gap-2">
          <MapControlBtn 
            icon={<Navigation size={18} />} 
            onClick={handleLocateMe}
            tooltip="Locate Me"
          />
          <MapControlBtn 
            icon={<Layers size={18} />} 
            onClick={() => {}}
            tooltip="Map Layers"
          />
          <MapControlBtn 
            icon={<Filter size={18} />} 
            onClick={() => setFiltersOpen(!filtersOpen)}
            active={filtersOpen}
            tooltip="Filter Projects"
          />
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-surface-950/80 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                <MapIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-400" size={24} />
              </div>
              <p className="mt-4 text-slate-900 dark:text-white font-medium animate-pulse">Loading spatial data...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend: Bottom Right */}
        <div className="absolute bottom-8 right-8 z-[40]">
          <div className="glass-card p-3 text-[10px] space-y-2 text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
              <span>Planned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapControlBtn({ icon, onClick, active, tooltip }: { icon: any, onClick: any, active?: boolean, tooltip: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl backdrop-blur-md border transition-all group relative ${
        active 
          ? "bg-brand-500 text-slate-900 dark:text-white border-brand-400" 
          : "bg-surface-900-80 text-slate-600 dark:text-slate-400 border-slate-900/10 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/20 dark:hover:border-white/20"
      }`}
    >
      {icon}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-900 text-[10px] text-slate-100 dark:text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-900/10 dark:border-white/10">
        {tooltip}
      </span>
    </button>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-surface-950" />}>
      <MapContent />
    </Suspense>
  );
}
