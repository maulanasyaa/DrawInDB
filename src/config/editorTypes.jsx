// Config editor per id tipe diagram. Satu-satunya tempat pemetaan JSX
// (sidebar/nodeTypes/edgeTypes/tips) per tipe; `diagramTypes.js` tetap data murni.
//
// Kontrak entri:
//   sidebar   : komponen sidebar (React element factory, dipanggil sebagai <sidebar/>)
//   nodeTypes : React Flow nodeTypes
//   edgeTypes : React Flow edgeTypes
//   defaultEdge: defaultEdgeOptions React Flow
//   addNode(type, position, ctx): aksi store untuk drop/klik palet
//   tips      : disclaimer/hint di bawah kanvas (JSX atau null)
//   overlays  : komponen side-effect (mis. inject SVG markers) atau null

import React from 'react';
import { FiInfo } from 'react-icons/fi';

import Sidebar from '../components/editor/Sidebar';
import FlowchartSidebar from '../components/editor/FlowchartSidebar';
import UseCaseSidebar from '../components/editor/UseCaseSidebar';
import StateMachineSidebar from '../components/editor/StateMachineSidebar';
import ArchitectureSidebar from '../components/editor/ArchitectureSidebar';

import TableNode from '../components/editor/TableNode';
import FlowchartNode from '../components/editor/FlowchartNode';
import UseCaseNode from '../components/editor/UseCaseNode';
import StateMachineNode from '../components/editor/StateMachineNode';
import ArchitectureNode from '../components/editor/ArchitectureNode';
import UseCaseEdge from '../components/editor/UseCaseEdge';
import StateMachineEdge from '../components/editor/StateMachineEdge';
import ArchitectureEdge from '../components/editor/ArchitectureEdge';

import UseCaseMarkers from '../components/editor/UseCaseMarkers';
import StateMachineMarkers from '../components/editor/StateMachineMarkers';

import { useEditorStore } from '../store/editorStore';
import { getDiagramType } from './diagramTypes';

/** Ikon + teks tips dalam satu komponen supaya markup tidak diduplikasi. */
function Tips({ children, wide = false }) {
  return (
    <div
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-theme px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-xs text-secondary animate-fade-in pointer-events-none ${
        wide ? 'max-w-[560px]' : ''
      }`}
    >
      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent">
        <FiInfo className="text-sm" />
      </div>
      <span>{children}</span>
    </div>
  );
}

export const EDITOR_TYPES = {
  erd: {
    sidebar: Sidebar,
    nodeTypes: { table: TableNode },
    edgeTypes: {},
    defaultEdge: { type: 'smoothstep' },
    addNode: (type, position) => {
      if (type === 'table') useEditorStore.getState().addTable(position);
    },
    tips: null,
    overlays: null,
  },
  flowchart: {
    sidebar: FlowchartSidebar,
    nodeTypes: { flowchart: FlowchartNode },
    edgeTypes: {},
    defaultEdge: { type: 'smoothstep' },
    addNode: (type, position) =>
      useEditorStore.getState().addFlowNode(type, position),
    tips: (
      <Tips>
        <strong className="text-primary font-medium">Tips:</strong> Drag the
        line from the <strong>Right/Bottom</strong> (Source) to the{' '}
        <strong>Left/Top</strong> (Target).
      </Tips>
    ),
    overlays: null,
  },
  usecase: {
    sidebar: UseCaseSidebar,
    nodeTypes: { usecase: UseCaseNode },
    edgeTypes: { usecase: UseCaseEdge },
    defaultEdge: { type: 'usecase' },
    addNode: (type, position) =>
      useEditorStore.getState().addUseCaseNode(type, position),
    tips: (
      <Tips wide>
        <strong className="text-primary font-medium">Tips:</strong> Pick a
        relationship type in the sidebar, then drag from a node handle to
        another node.
      </Tips>
    ),
    overlays: UseCaseMarkers,
  },
  statemachine: {
    sidebar: StateMachineSidebar,
    nodeTypes: { statemachine: StateMachineNode },
    edgeTypes: { statemachine: StateMachineEdge },
    defaultEdge: { type: 'statemachine' },
    addNode: (type, position) =>
      useEditorStore.getState().addStateMachineNode(type, position),
    tips: (
      <Tips wide>
        <strong className="text-primary font-medium">Tips:</strong> Drag between
        nodes to add a transition, then click its label to edit{' '}
        <strong>event [guard] / action</strong>.
      </Tips>
    ),
    overlays: StateMachineMarkers,
  },
  architecture: {
    sidebar: ArchitectureSidebar,
    nodeTypes: { architecture: ArchitectureNode },
    edgeTypes: { architecture: ArchitectureEdge },
    defaultEdge: { type: 'architecture' },
    addNode: (type, position) =>
      useEditorStore.getState().addArchitectureNode(type, position),
    tips: (
      <Tips wide>
        <strong className="text-primary font-medium">Tips:</strong> Drag between
        elements to add a relationship, then click its label to edit{' '}
        <strong>description [technology]</strong>.
      </Tips>
    ),
    // Panah Architecture dideklarasikan di dalam komponen edge sendiri
    // (satu dokumen SVG dengan path pemakainya) — tidak butuh overlay.
    overlays: null,
  },
};

/** Config tak dikenal jatuh ke perilaku ERD — sama dengan fallback `getDiagramType`. */
export function getEditorConfig(id) {
  return EDITOR_TYPES[getDiagramType(id).id] ?? EDITOR_TYPES.erd;
}
