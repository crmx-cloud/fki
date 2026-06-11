import { useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { BrandStateMap } from "@/components/BrandStateMap";

export function EmbedMapPage() {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const brand = useQuery(api.brands.getBySlug, brandSlug ? { slug: brandSlug } : "skip");
  const territories = useQuery(
    api.territories.listByBrand,
    brand ? { brandId: brand._id } : "skip"
  );
  const stateAvailability = useQuery(
    api.stateAvailability.getByBrand,
    brand ? { brandId: brand._id } : "skip"
  );

  // Still loading or brand not found
  if (brand === undefined || territories === undefined) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontFamily: "system-ui",
        }}
      >
        Loading...
      </div>
    );
  }

  if (brand === null) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontFamily: "system-ui",
        }}
      >
        Brand not found
      </div>
    );
  }

  const stateRows = stateAvailability ?? [];
  const isEmpty = territories.length === 0 && stateRows.length === 0;

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0f172a", position: "relative" }}>
      {/* ONE map engine everywhere — same component and same two tables
          (stateAvailability + territories) as the brand profile and View Map
          pages, so all surfaces always tell the same availability story. */}
      <BrandStateMap
        territories={territories as any}
        stateAvailability={stateRows as any}
        brandName={brand.name}
        height="100vh"
        showNoDataNote={false}
      />
      {isEmpty && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            padding: "16px 28px",
            borderRadius: "12px",
            color: "#94a3b8",
            fontFamily: "system-ui",
            fontSize: "14px",
            fontWeight: 500,
            textAlign: "center",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          Territory map coming soon
        </div>
      )}
    </div>
  );
}
