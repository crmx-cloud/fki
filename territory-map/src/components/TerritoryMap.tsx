import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { US_STATES_GEOJSON_URL } from "@/lib/us-states-geo";

interface Territory {
  _id: string;
  city: string;
  state: string;
  status: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  assignedTo?: string;
  name?: string;
}

interface TerritoryMapProps {
  territories: Territory[];
  brandName?: string;
  brandColor?: string;
  showContactInfo?: boolean;
  height?: string;
  onTerritoryClick?: (territory: Territory) => void;
  embedded?: boolean;
  theme?: "dark" | "light";
  registeredStates?: string[];
}

const ALL_STATUSES = ["available", "high_interest", "pending_award", "sold", "open"] as const;

export function TerritoryMap({
  territories,
  brandName,
  brandColor,
  showContactInfo = false,
  height = "500px",
  onTerritoryClick,
  embedded = false,
  theme = "dark",
  registeredStates = [],
}: TerritoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);

  // Multi-select: all statuses active by default
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    new Set(ALL_STATUSES)
  );
  const [geoData, setGeoData] = useState<any>(null);

  // Load GeoJSON once
  useEffect(() => {
    if (registeredStates.length === 0) return;
    fetch(US_STATES_GEOJSON_URL)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, [registeredStates.length > 0]);

  const toggleStatus = useCallback((status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setActiveStatuses(new Set(ALL_STATUSES));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const validTerritories = territories.filter(
      (t) => t.latitude && t.longitude
    );

    const centerLat =
      validTerritories.length > 0
        ? validTerritories.reduce((s, t) => s + (t.latitude || 0), 0) /
          validTerritories.length
        : 39.8;
    const centerLng =
      validTerritories.length > 0
        ? validTerritories.reduce((s, t) => s + (t.longitude || 0), 0) /
          validTerritories.length
        : -98.5;
    const defaultZoom = validTerritories.length > 0 ? 7 : 4;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: defaultZoom,
      zoomControl: !embedded,
      attributionControl: !embedded,
    });

    mapInstanceRef.current = map;

    const tileUrl =
      theme === "light"
        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Create markers layer group
    markersLayerRef.current = L.featureGroup().addTo(map);

    // Fit bounds if multiple territories
    if (validTerritories.length > 1) {
      const bounds = L.latLngBounds(
        validTerritories.map((t) => [t.latitude!, t.longitude!])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [territories, embedded, theme]);

  // Update state GeoJSON layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoData || registeredStates.length === 0) return;

    // Remove old layer
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    const registeredSet = new Set(registeredStates.map((s) => s.toLowerCase()));

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const stateName = feature?.properties?.name || "";
        const isRegistered = registeredSet.has(stateName.toLowerCase());
        if (isRegistered) {
          return {
            fillColor: "#38bdf8",
            fillOpacity: 0.15,
            color: "#38bdf8",
            weight: 1.5,
            opacity: 0.5,
          };
        }
        return {
          fillColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
          fillOpacity: theme === "dark" ? 0.3 : 0.2,
          color: theme === "dark" ? "#334155" : "#cbd5e1",
          weight: 0.5,
          opacity: 0.4,
        };
      },
      onEachFeature: (feature, layer) => {
        const stateName = feature?.properties?.name || "";
        const isRegistered = registeredSet.has(stateName.toLowerCase());
        if (isRegistered) {
          layer.bindTooltip(
            `<div style="font-family:system-ui;padding:2px 4px;">
              <strong>${stateName}</strong>
              <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(56,189,248,0.2);color:#38bdf8;">✓ Registered</span>
            </div>`,
            {
              sticky: true,
              direction: "top",
              className: "state-tooltip-leaflet",
            }
          );
          layer.on("mouseover", function (this: L.Layer) {
            (this as any).setStyle({
              fillOpacity: 0.28,
              weight: 2,
              opacity: 0.7,
            });
          });
          layer.on("mouseout", function (this: L.Layer) {
            (this as any).setStyle({
              fillOpacity: 0.15,
              weight: 1.5,
              opacity: 0.5,
            });
          });
        }
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;

    // Ensure markers stay on top
    if (markersLayerRef.current) {
      markersLayerRef.current.bringToFront();
    }
  }, [geoData, registeredStates, theme]);

  // Update pin markers when filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validTerritories = territories.filter(
      (t) => t.latitude && t.longitude
    );
    const filteredTerritories = validTerritories.filter((t) =>
      activeStatuses.has(t.status)
    );

    filteredTerritories.forEach((territory) => {
      const color = STATUS_COLORS[territory.status] || "#06b6d4";
      const pulseClass = "pulse-marker";

      const icon = L.divIcon({
        className: "custom-territory-marker",
        html: `
          <div class="territory-dot ${pulseClass}" data-status="${territory.status}" style="background-color: ${color}; --dot-color: ${color};">
            <div class="territory-dot-inner" style="background-color: ${color};"></div>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([territory.latitude!, territory.longitude!], {
        icon,
        zIndexOffset: 1000,
      }).addTo(markersLayer);

      const contactLine =
        showContactInfo && territory.assignedTo
          ? `<div style="color:#94a3b8;font-size:11px;margin-top:4px;">Contact: ${territory.assignedTo}</div>`
          : "";
      const notesLine = territory.notes
        ? `<div style="color:#94a3b8;font-size:11px;margin-top:4px;">${territory.notes}</div>`
        : "";

      marker.bindPopup(
        `<div style="font-family:system-ui;min-width:160px;padding:4px 0;">
          <div style="font-weight:700;font-size:14px;color:#f1f5f9;">${territory.city}, ${territory.state}</div>
          <div style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:white;background:${color};">
            ${STATUS_LABELS[territory.status] || territory.status}
          </div>
          ${contactLine}
          ${notesLine}
        </div>`,
        { className: "dark-popup" }
      );

      if (onTerritoryClick) {
        marker.on("click", () => onTerritoryClick(territory));
      }
    });
  }, [territories, activeStatuses, showContactInfo, onTerritoryClick]);

  // Status counts for legend
  const statusCounts: Record<string, number> = {};
  territories.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const hasRegistered = registeredStates.length > 0;

  return (
    <div className="relative" style={{ isolation: "isolate", zIndex: 0 }}>
      {/* Multi-select filter chips */}
      {territories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            theme === "light" ? "text-slate-500" : "text-slate-500"
          }`}>
            Show Pins:
          </span>
          <button
            onClick={selectAll}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeStatuses.size === ALL_STATUSES.length
                ? theme === "light"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-900"
                : theme === "light"
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                : "bg-white/10 text-white/50 hover:bg-white/20"
            }`}
          >
            All ({territories.length})
          </button>
          {ALL_STATUSES.map((status) => {
            const count = statusCounts[status] || 0;
            if (count === 0) return null;
            const isActive = activeStatuses.has(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? "border-current opacity-100"
                    : theme === "light"
                    ? "border-slate-200 opacity-40 hover:opacity-60"
                    : "border-white/10 opacity-40 hover:opacity-60"
                }`}
                style={{
                  color: isActive ? STATUS_COLORS[status] : undefined,
                  backgroundColor: isActive
                    ? `${STATUS_COLORS[status]}15`
                    : "transparent",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                {STATUS_LABELS[status] || status} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className={`rounded-xl overflow-hidden border ${
          theme === "light" ? "border-slate-200" : "border-white/10"
        }`}
      />

      {/* Legend row below map */}
      {(hasRegistered || territories.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1">
          {hasRegistered && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className="w-4 h-2.5 rounded-sm"
                style={{
                  background: "rgba(56,189,248,0.2)",
                  border: "1px solid rgba(56,189,248,0.5)",
                }}
              />
              Registered State
            </div>
          )}
          {ALL_STATUSES.map((status) =>
            statusCounts[status] ? (
              <div
                key={status}
                className="flex items-center gap-1.5 text-[11px] text-slate-400"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                {STATUS_LABELS[status]}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Empty state overlay */}
      {territories.length === 0 && !embedded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div
            className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl backdrop-blur-sm ${
              theme === "light"
                ? "bg-white/70 text-slate-500"
                : "bg-slate-900/70 text-slate-400"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm font-medium">
              No territories mapped yet
            </span>
          </div>
        </div>
      )}

      {/* Powered by badge for embed */}
      {embedded && (
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-slate-400 flex items-center gap-1.5 z-[1000]">
          Powered by{" "}
          <span className="font-semibold text-cyan-400">Franchise KI</span>
        </div>
      )}
    </div>
  );
}
