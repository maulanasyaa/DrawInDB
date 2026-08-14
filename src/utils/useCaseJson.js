// Helper untuk export/import JSON diagram Use Case.
// Format kompatibel dengan struktur file diagram DrawInDB existing.

import {
  USECASE_NODE_TYPES,
  USECASE_REL_TYPES,
} from "../config/useCaseTypes";

const VALID_NODE_SUBTYPES = new Set(Object.values(USECASE_NODE_TYPES));
const VALID_REL_TYPES = new Set(Object.values(USECASE_REL_TYPES));

/**
 * Bangun payload JSON export dari state editor.
 */
export function buildUseCaseExport(diagramMeta, nodes, edges, canvasState) {
  return {
    version: "1.0",
    meta: {
      name: diagramMeta?.name || "Untitled Use Case Diagram",
      type: "usecase",
      exported_at: new Date().toISOString(),
    },
    canvas: canvasState || { x: 0, y: 0, zoom: 1 },
    nodes: (nodes || []).map((n) => ({
      id: n.id,
      type: "usecase",
      subtype: n.data?.type,
      position: n.position,
      parentNode: n.parentNode || null,
      extent: n.extent || null,
      style: n.style || null,
      data: {
        type: n.data?.type,
        label: n.data?.label ?? "",
      },
    })),
    edges: (edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
      data: {
        relType: e.data?.relType || USECASE_REL_TYPES.ASSOCIATION,
      },
    })),
  };
}

/**
 * Validasi + normalisasi hasil import.
 * Return { nodes, edges } atau throw Error dengan pesan jelas.
 */
export function parseUseCaseImport(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON: root must be an object.");
  }
  if (raw.meta?.type && raw.meta.type !== "usecase") {
    throw new Error(
      `Diagram type mismatch: expected "usecase", got "${raw.meta.type}".`
    );
  }
  if (!Array.isArray(raw.nodes)) {
    throw new Error("Invalid JSON: 'nodes' must be an array.");
  }
  if (!Array.isArray(raw.edges)) {
    throw new Error("Invalid JSON: 'edges' must be an array.");
  }

  const validIds = new Set();

  const nodes = raw.nodes
    .filter((n) => n && typeof n.id === "string")
    .map((n) => {
      const subtype = n.subtype || n.data?.type;
      if (!VALID_NODE_SUBTYPES.has(subtype)) {
        // Skip node dengan subtype tidak dikenal — gracefully
        return null;
      }
      validIds.add(n.id);
      return {
        id: n.id,
        type: "usecase",
        position: {
          x: Number(n.position?.x) || 0,
          y: Number(n.position?.y) || 0,
        },
        parentNode: n.parentNode || undefined,
        extent: n.extent || undefined,
        style: n.style || undefined,
        data: {
          type: subtype,
          label: typeof n.data?.label === "string" ? n.data.label : "",
        },
      };
    })
    .filter(Boolean);

  const edges = raw.edges
    .filter((e) => e && typeof e.id === "string")
    .filter((e) => validIds.has(e.source) && validIds.has(e.target))
    .map((e) => {
      const relType = VALID_REL_TYPES.has(e.data?.relType)
        ? e.data.relType
        : USECASE_REL_TYPES.ASSOCIATION;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
        type: "usecase",
        data: { relType },
      };
    });

  return {
    nodes,
    edges,
    canvasState: raw.canvas || { x: 0, y: 0, zoom: 1 },
  };
}