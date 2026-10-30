// Strategi `onConnect` per id tipe diagram. Store hanya me-lookup lewat id tipe;
// tidak ada percabangan `type === '...'` di store.
//
// Kontrak: `strategy(connection, { get, addEdge })` mengembalikan patch state
// (atau null bila koneksi ditolak). Store yang men-set patch + mencatat history.

import { addEdge } from 'reactflow';
import { USECASE_REL_TYPES } from './useCaseTypes';
import { ARCH_EDGE_Z } from '../utils/architectureEdgeLayout';

const usecase = (connection, { get }) => {
  const relType = get().usecaseRelType || USECASE_REL_TYPES.ASSOCIATION;
  const newEdge = {
    ...connection,
    id: `uce-${connection.source}-${connection.target}-${Date.now()}`,
    type: 'usecase',
    data: { relType },
  };
  return { flowEdges: addEdge(newEdge, get().flowEdges) };
};

const flowchart = (connection, { get }) => {
  const sourceNode = get().nodes.find((n) => n.id === connection.source);
  let edgeLabel = '';

  if (sourceNode?.data?.type === 'decision') {
    const existingOutEdges = get().flowEdges.filter((e) => e.source === sourceNode.id);
    edgeLabel = existingOutEdges.length === 0 ? 'Yes' : 'No';
  }

  const newEdge = {
    ...connection,
    id: `e-${connection.source}-${connection.target}-${Date.now()}`,
    label: edgeLabel,
    type: 'smoothstep',
    style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
    labelStyle: { fill: '#e4e4e7', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#18181b', stroke: '#3f3f46', strokeWidth: 1 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: 'arrowclosed', color: '#a1a1aa' },
  };

  return { flowEdges: addEdge(newEdge, get().flowEdges) };
};

/**
 * ERD: FK jatuh ke kolom TARGET apa pun status PK-nya. `pk` hanya dipakai
 * untuk menentukan tipe kolom acuan. Sengaja tidak memakai heuristik PK untuk
 * memindah arah; `fk` harus konsisten dengan clearOrphanFk yang membersihkan
 * kolom target.
 */
const erd = (connection, { get }) => {
  const { tables, relationships } = get();
  const sourceTable = tables.find((t) => t.id === connection.source);
  const targetTable = tables.find((t) => t.id === connection.target);
  const sourceCol = sourceTable?.data.columns.find((c) => c.id === connection.sourceHandle);
  const targetCol = targetTable?.data.columns.find((c) => c.id === connection.targetHandle);

  if (!sourceCol || !targetCol) return null;

  const parentCol = sourceCol;
  const childCol = targetCol;
  const childTableId = connection.target;

  const edge = {
    ...connection,
    id: `rel-${Date.now()}`,
    type: 'smoothstep',
    animated: false,
    style: { strokeWidth: 1.5 },
  };

  const updatedTables = tables.map((t) => {
    if (t.id === childTableId) {
      const updatedCols = t.data.columns.map((c) =>
        c.id === childCol.id ? { ...c, type: parentCol.type, fk: true } : c,
      );
      return { ...t, data: { ...t.data, columns: updatedCols } };
    }
    return t;
  });

  return { relationships: addEdge(edge, relationships), tables: updatedTables };
};

/**
 * State Machine: transition. Sengaja TIDAK memakai `addEdge` (yang men-dedupe
 * source/target/handle): UML mengizinkan beberapa transition antara dua state
 * yang sama dengan event berbeda, termasuk self-transition.
 */
const statemachine = (connection, { get }) => {
  const newEdge = {
    ...connection,
    id: `sm-${connection.source}-${connection.target}-${Date.now()}`,
    type: 'statemachine',
    data: { label: '' },
  };
  return { flowEdges: [...get().flowEdges, newEdge] };
};

/**
 * Architecture: relationship C4 (deskripsi + teknologi). Self-loop ditolak
 * (kembalikan null — jalur penolakan yang sama dengan ERD): C4 relationship
 * menghubungkan dua elemen berbeda; loop dalam satu elemen bukan relasi
 * bermakna di level Context/Container. Tanpa dedupe — beberapa relationship
 * antara dua elemen sama (teknologi/deskripsi beda) sah.
 */
const architecture = (connection, { get }) => {
  if (connection.source === connection.target) return null;

  const newEdge = {
    ...connection,
    id: `arch-${connection.source}-${connection.target}-${Date.now()}`,
    type: 'architecture',
    // Di atas node (boundary zIndex negatif), lihat architectureEdgeLayout.js.
    zIndex: ARCH_EDGE_Z,
    data: { label: '', technology: '' },
  };
  return { flowEdges: [...get().flowEdges, newEdge] };
};

/**
 * Sequence: tidak ada koneksi di kanvas. Pesan ditambahkan lewat sidebar, jadi
 * tidak ada patch — `onConnect` sudah no-op saat strategi mengembalikan null.
 */
const sequence = () => null;

export const CONNECT_STRATEGIES = { erd, flowchart, usecase, statemachine, architecture, sequence };
