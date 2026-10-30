import React, { useEffect } from 'react';
import { useStore } from 'reactflow';

/**
 * Inject arrow marker Architecture ke dalam SVG edges React Flow.
 * Marker harus berada di SVG yang sama dengan path yang memakainya
 * (url(#id) tidak lintas SVG), dan karena ada di dalam `.react-flow__edges`
 * marker ikut ter-capture saat Export PNG.
 */
export default function ArchitectureMarkers() {
  const edgesCount = useStore((s) => s.edges.length);

  useEffect(() => {
    const timer = setTimeout(() => {
      const edgesSvg = document.querySelector('.react-flow__edges');
      if (!edgesSvg) return;
      if (edgesSvg.querySelector('defs[data-arch-markers]')) return;

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('data-arch-markers', 'true');
      defs.innerHTML = `
        <marker
          id="arch-arrow-def"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="var(--text-primary)" stroke-width="1.6" />
        </marker>
        <marker
          id="arch-arrow-sel"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="var(--border-focus)" stroke-width="1.8" />
        </marker>
      `;

      edgesSvg.insertBefore(defs, edgesSvg.firstChild);
    }, 100);

    return () => clearTimeout(timer);
  }, [edgesCount]);

  return null;
}
