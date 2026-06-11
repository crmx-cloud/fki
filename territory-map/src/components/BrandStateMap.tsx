import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATE_ABBREVS } from "@/lib/us-states-geo";

/** Local GeoJSON of US states — features carry properties.name (full state names). */
const LOCAL_US_STATES_GEOJSON = "/us-states.geojson";

export interface StateAvailabilityRow {
  state: string; // 2-letter code, e.g. "TX"
  status: "open" | "registered" | "closed";
  note?: string;
}

interface BrandStateMapTerritory {
  _id: string;
  city: string;
  state: string;
  status: string;
  latitude?: number;
  longitude?: number;
}

interface BrandStateMapProps {
  territories: BrandStateMapTerritory[];
  stateAvailability: StateAvailabilityRow[];
  brandName?: string;
  height?: string;
  /** Optional initial map center [lat, lng]. Defaults to the continental US. */
  center?: [number, number];
  /** Optional initial zoom level. Defaults to 4 (continental US). */
  zoom?: number;
  /** Optional user location — rendered as a distinct pulsing cyan dot. */
  userLocation?: { latitude: number; longitude: number; label?: string };
  /** Show the built-in "availability not yet published" banner (default true). */
  showNoDataNote?: boolean;
}

// ── State shading by availability status (light theme) ──
const STATE_FILL: Record<StateAvailabilityRow["status"], { fill: string; fillOpacity: number; border: string }> = {
  open: { fill: "#10b981", fillOpacity: 0.35, border: "#059669" },       // emerald
  registered: { fill: "#f59e0b", fillOpacity: 0.3, border: "#d97706" },  // amber
  closed: { fill: "#64748b", fillOpacity: 0.25, border: "#94a3b8" },     // slate
};

const STATE_TOOLTIP_LABEL: Record<StateAvailabilityRow["status"], string> = {
  open: "Open for new franchisees",
  registered: "FDD-registered",
  closed: "Not currently available",
};

const STATE_BADGE_STYLE: Record<StateAvailabilityRow["status"], string> = {
  open: "background:rgba(16,185,129,0.15);color:#059669;",
  registered: "background:rgba(245,158,11,0.15);color:#b45309;",
  closed: "background:rgba(100,116,139,0.15);color:#475569;",
};

/** Confirmed franchisor-listed open territories (rare/special). */
const CONFIRMED_OPEN_STATUSES = new Set(["available", "high_interest", "pending_award"]);

export function BrandStateMap({
  territories,
  stateAvailability,
  brandName,
  height = "500px",
  center,
  zoom,
  userLocation,
  showNoDataNote = true,
}: BrandStateMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [geoData, setGeoData] = useState<any>(null);

  const hasAvailability = stateAvailability.length > 0;

  // Load local US states GeoJSON once
  useEffect(() => {
    fetch(LOCAL_US_STATES_GEOJSON)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, []);

  // Initialize map (continental US view)
  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: center ?? [39.8, -98.5],
      zoom: zoom ?? 4,
      zoomControl: true,
      attributionControl: true,
      // Page scroll must never hijack into map zoom — zoom activates only
      // after the user clicks/taps the map, and releases when they leave.
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    // ── Recenter control (under the +/- zoom buttons) ──
    const homeCenter: L.LatLngExpression = center ?? [39.8, -98.5];
    const homeZoom = zoom ?? 4;
    const RecenterControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const a = L.DomUtil.create("a", "", div);
        a.href = "#";
        a.title = "Reset view";
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", "Reset map view");
        a.style.cssText = "font-size:15px;line-height:26px;text-align:center;display:block;width:26px;height:26px;";
        a.innerHTML = "&#8962;"; // ⌂ house glyph
        L.DomEvent.on(a, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          map.setView(homeCenter, homeZoom, { animate: true });
        });
        return div;
      },
    });
    map.addControl(new RecenterControl());

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    markersLayerRef.current = L.featureGroup().addTo(map);

    // Leaflet measures the container synchronously at construction. If the
    // container is still settling (e.g. the section just swapped into the
    // layout), the rendered view drifts off-center even though Leaflet's
    // logical center is correct — re-measuring fixes it. Observe all
    // subsequent size changes too.
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.invalidateSize())
        : null;
    if (resizeObserver && mapRef.current) resizeObserver.observe(mapRef.current);
    const settleTimer = window.setTimeout(() => {
      map.invalidateSize();
      map.setView(center ?? [39.8, -98.5], zoom ?? 4, { animate: false });
    }, 100);

    return () => {
      window.clearTimeout(settleTimer);
      resizeObserver?.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // State-shaded GeoJSON layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoData) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    // 2-letter code → status lookup
    const statusByCode = new Map<string, StateAvailabilityRow["status"]>();
    stateAvailability.forEach((row) => {
      statusByCode.set(row.state.toUpperCase(), row.status);
    });

    const statusForFeature = (feature: any): StateAvailabilityRow["status"] | undefined => {
      const fullName: string = feature?.properties?.name || "";
      const code = STATE_ABBREVS[fullName];
      return code ? statusByCode.get(code) : undefined;
    };

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const status = statusForFeature(feature);
        if (status) {
          const s = STATE_FILL[status];
          return {
            fillColor: s.fill,
            fillOpacity: s.fillOpacity,
            color: s.border,
            weight: 1,
            opacity: 0.6,
          };
        }
        // No data — keep the state transparent with a faint outline
        return {
          fillColor: "#e2e8f0",
          fillOpacity: 0,
          color: "#cbd5e1",
          weight: 0.5,
          opacity: 0.4,
        };
      },
      onEachFeature: (feature, lyr) => {
        const stateName = feature?.properties?.name || "";
        const status = statusForFeature(feature);
        if (!status) return;
        const s = STATE_FILL[status];
        lyr.bindTooltip(
          `<div style="font-family:system-ui;padding:2px 4px;">
            <strong>${stateName}</strong>
            <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;${STATE_BADGE_STYLE[status]}">
              ${STATE_TOOLTIP_LABEL[status]}
            </span>
          </div>`,
          { sticky: true, direction: "top", className: "state-tooltip-leaflet" }
        );
        lyr.on("mouseover", function (this: L.Layer) {
          (this as any).setStyle({ fillOpacity: Math.min(s.fillOpacity + 0.15, 0.6), weight: 2, opacity: 0.85 });
        });
        lyr.on("mouseout", function (this: L.Layer) {
          (this as any).setStyle({ fillOpacity: s.fillOpacity, weight: 1, opacity: 0.6 });
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;

    // Pins always on top of state shading
    if (markersLayerRef.current) {
      markersLayerRef.current.bringToFront();
    }
  }, [geoData, stateAvailability]);

  // Pin markers — only real things: operating locations, claimed, confirmed-open
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!mapInstanceRef.current || !markersLayer) return;

    markersLayer.clearLayers();

    const valid = territories.filter((t) => t.latitude && t.longitude);

    valid.forEach((t) => {
      const isConfirmedOpen = CONFIRMED_OPEN_STATUSES.has(t.status);
      const isOperating = t.status === "open";
      const isSold = t.status === "sold";
      if (!isConfirmedOpen && !isOperating && !isSold) return;

      let icon: L.DivIcon;
      let popupLabel: string;
      let popupColor: string;

      if (isConfirmedOpen) {
        // Rare franchisor-confirmed open territory — highlighted emerald pin
        icon = L.divIcon({
          className: "custom-territory-marker",
          html: `
            <div class="territory-dot pulse-marker" style="background-color: #10b981; --dot-color: #10b981;">
              <div class="territory-dot-inner" style="background-color: #10b981;"></div>
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        popupLabel = "Confirmed open territory";
        popupColor = "#10b981";
      } else if (isOperating) {
        // Existing operating location — small neutral slate-blue dot
        icon = L.divIcon({
          className: "custom-territory-marker",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#475569;border:1.5px solid #ffffff;box-shadow:0 1px 3px rgba(15,23,42,0.4);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        popupLabel = "Operating location";
        popupColor = "#475569";
      } else {
        // Sold / claimed — muted dot
        icon = L.divIcon({
          className: "custom-territory-marker",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#94a3b8;opacity:0.8;border:1.5px solid #ffffff;box-shadow:0 1px 2px rgba(15,23,42,0.3);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        popupLabel = "Claimed territory";
        popupColor = "#94a3b8";
      }

      const marker = L.marker([t.latitude!, t.longitude!], {
        icon,
        zIndexOffset: isConfirmedOpen ? 1000 : 500,
      }).addTo(markersLayer);

      marker.bindPopup(
        `<div style="font-family:system-ui;min-width:160px;padding:4px 0;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${t.city}, ${t.state}</div>
          <div style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:white;background:${popupColor};">
            ${popupLabel}
          </div>
        </div>`
      );
    });
  }, [territories]);

  // User-location marker — distinct pulsing cyan dot, always on top
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (!userLocation) return;

    const icon = L.divIcon({
      className: "custom-territory-marker",
      html: `
        <div class="territory-dot pulse-marker" style="background-color:#06b6d4;--dot-color:#06b6d4;border:2px solid #ffffff;">
          <div class="territory-dot-inner" style="background-color:#ffffff;"></div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker([userLocation.latitude, userLocation.longitude], {
      icon,
      zIndexOffset: 2000,
    }).addTo(map);
    marker.bindTooltip(userLocation.label || "Your location", {
      direction: "top",
      offset: [0, -10],
      className: "state-tooltip-leaflet",
    });
    userMarkerRef.current = marker;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation?.latitude, userLocation?.longitude, userLocation?.label]);

  const operatingCount = territories.filter((t) => t.status === "open").length;
  const claimedCount = territories.filter((t) => t.status === "sold").length;
  const confirmedOpenCount = territories.filter((t) => CONFIRMED_OPEN_STATUSES.has(t.status)).length;

  return (
    <div className="relative" style={{ isolation: "isolate", zIndex: 0 }}>
      {/* No-data note */}
      {showNoDataNote && !hasAvailability && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
          State availability not yet published — inquire for current openings.
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className="rounded-xl overflow-hidden border border-slate-200"
      />

      {/* Plain-English legend */}
      <div className="mt-3 px-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {hasAvailability && (
            <>
              <LegendSwatch color="rgba(16,185,129,0.35)" border="#059669" label="Open for new franchisees" />
              <LegendSwatch color="rgba(245,158,11,0.3)" border="#d97706" label="FDD-registered (not a current focus)" />
              <LegendSwatch color="rgba(100,116,139,0.25)" border="#94a3b8" label="Not currently available" />
            </>
          )}
          {operatingCount > 0 && (
            <LegendDot color="#475569" label={`Existing ${brandName || "operating"} locations`} />
          )}
          {claimedCount > 0 && <LegendDot color="#94a3b8" label="Claimed / sold territories" />}
          {confirmedOpenCount > 0 && (
            <LegendDot color="#10b981" label="Confirmed open territories" pulse />
          )}
          {userLocation && <LegendDot color="#06b6d4" label="Your location" pulse />}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Green states are open for new franchisees — specific territories are confirmed when you inquire.
        </p>
      </div>
    </div>
  );
}

function LegendSwatch({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
      <span
        className="w-4 h-2.5 rounded-sm shrink-0"
        style={{ background: color, border: `1px solid ${border}` }}
      />
      {label}
    </div>
  );
}

function LegendDot({ color, label, pulse = false }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${pulse ? "ring-2 ring-emerald-200" : ""}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
