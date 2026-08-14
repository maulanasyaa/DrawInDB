import React, { useEffect } from "react";
import { useStore } from "reactflow";

/**
 * Inject SVG markers ke dalam React Flow edges SVG.
 * Menggunakan approach ini karena url(#id) di SVG path tidak bisa
 * merujuk ke marker di SVG lain — harus dalam SVG yang sama.
 */
export default function UseCaseMarkers() {
  // Trigger re-run saat edges berubah (baru dibuat/dihapus)
  const edgesCount = useStore((s) => s.edges.length);

  useEffect(() => {
    // Delay sedikit supaya React Flow selesai render edges SVG
    const timer = setTimeout(() => {
      const edgesSvg = document.querySelector(".react-flow__edges");
      if (!edgesSvg) return;

      // Cek apakah defs kita sudah ada
      let defs = edgesSvg.querySelector("defs[data-usecase-markers]");

      if (!defs) {
        // Buat defs baru
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.setAttribute("data-usecase-markers", "true");

        defs.innerHTML = `
          <marker
            id="uc-triangle-def"
            viewBox="0 0 12 12"
            refX="11"
            refY="6"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 11 6 L 0 12 z"
              fill="var(--bg-surface)"
              stroke="var(--text-primary)"
              stroke-width="1.2"
            />
          </marker>

          <marker
            id="uc-triangle-sel"
            viewBox="0 0 12 12"
            refX="11"
            refY="6"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 11 6 L 0 12 z"
              fill="var(--bg-surface)"
              stroke="var(--border-focus)"
              stroke-width="1.5"
            />
          </marker>

          <marker
            id="uc-openarrow-def"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 9 5 L 0 10"
              fill="none"
              stroke="var(--text-primary)"
              stroke-width="1.5"
            />
          </marker>

          <marker
            id="uc-openarrow-sel"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 9 5 L 0 10"
              fill="none"
              stroke="var(--border-focus)"
              stroke-width="1.5"
            />
          </marker>
        `;

        // Insert sebagai child pertama dari SVG edges
        edgesSvg.insertBefore(defs, edgesSvg.firstChild);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [edgesCount]);

  // Component ini tidak render apa-apa, hanya side effect
  return null;
}
