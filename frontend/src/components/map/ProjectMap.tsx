"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPin as MapPinType } from "@/types";
import { markerColor } from "@/lib/utils";

interface ProjectMapProps {
  pins: MapPinType[];
  onSelectPin?: (id: string) => void;
  className?: string;
  userLocation?: { lat: number; lng: number } | null;
}

let L: typeof import("leaflet") | null = null;

export function ProjectMap({ pins, onSelectPin, className = "", userLocation }: ProjectMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Leaflet must be imported client-side only
    import("leaflet").then((leaflet) => {
      L = leaflet.default ?? leaflet;
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || !L) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Init map centered on Bhubaneswar (Phase 1)
    const map = L.map(mapRef.current, {
      center: [20.296, 85.824],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Dark OSM tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        'Â© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
  }, [loaded]);

  // Update markers when pins change
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    // Remove old markers
    map.eachLayer((layer) => {
      if ((layer as any)._infrasight_marker) {
        map.removeLayer(layer);
      }
    });

    // Add new markers
    pins.forEach((pin) => {
      if (!pin.lat || !pin.lng || !L) return;

      const color = markerColor(pin.status);

      // Custom circular SVG marker
      const icon = L!.divIcon({
        className: "",
        html: `
          <div style="
            width:14px; height:14px;
            background:${color};
            border:2px solid rgba(255,255,255,0.7);
            border-radius:50%;
            box-shadow:0 0 8px ${color}80;
            cursor:pointer;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L!.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:180px">
            <p style="font-size:13px;font-weight:600;margin:0 0 6px;color:#f1f5f9;line-height:1.3">
              ${pin.title}
            </p>
            <div style="font-size:11px;color:#94a3b8">
              ${pin.status.replace("_", " ")} Â· ${pin.category}
            </div>
            <a href="/projects/${pin.id}"
               style="display:inline-block;margin-top:8px;font-size:11px;color:#38bdf8;text-decoration:none">
              View details â†’
            </a>
          </div>
        `, { maxWidth: 260 });

      (marker as any)._infrasight_marker = true;

      if (onSelectPin) {
        marker.on("click", () => onSelectPin(pin.id));
      }
    });

    // Add User Location Marker
    if (userLocation && L) {
      const userIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:16px; height:16px;
            background:#38bdf8;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 12px #38bdf8;
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div style="font-size:12px;font-weight:bold;color:#f1f5f9">You are here</div>');
      (userMarker as any)._infrasight_marker = true;

      // Center map on user location
      map.setView([userLocation.lat, userLocation.lng], 13);
    } else if (pins.length > 0 && L) {
      // Fit bounds if no user location but pins exist
      const group = L.featureGroup(pins.map(p => L!.marker([p.lat!, p.lng!])));
      map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 14 });
    }

  }, [pins, loaded, onSelectPin, userLocation]);

  if (!loaded) {
    return (
      <div className={`flex items-center justify-center bg-surface-800 rounded-xl ${className}`}>
        <div className="text-slate-600 dark:text-slate-500 text-sm">Loading mapâ€¦</div>
      </div>
    );
  }

  return <div ref={mapRef} className={`map-container ${className}`} />;
}
