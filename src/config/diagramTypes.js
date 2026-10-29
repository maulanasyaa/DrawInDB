// Single source of truth untuk tipe diagram. Tambah tipe baru dengan menambah satu entri di sini.

import { FiDatabase, FiGitBranch, FiUsers } from "react-icons/fi";

export const DIAGRAM_TYPES = {
  erd: {
    id: "erd",
    label: "ERD",
    labelPlural: "ERDs",
    placeholder: "Auth Schema",
    badge: "ERD",
    backLabel: "ERD",
    description: "Design your database schema, establish relationships, and generate SQL.",
    icon: FiDatabase,
    dataShape: "tables",
    hasDbType: true,
    exports: { png: true, sql: true, json: false },
  },
  flowchart: {
    id: "flowchart",
    label: "Flowchart",
    labelPlural: "Flowcharts",
    placeholder: "Login Flow",
    badge: "FLOWCHART",
    backLabel: "Flowchart",
    description: "Map out process logic, decision flows, and algorithms step-by-step.",
    icon: FiGitBranch,
    dataShape: "graph",
    hasDbType: false,
    exports: { png: true, sql: false, json: false },
  },
  usecase: {
    id: "usecase",
    label: "Use Case Diagram",
    labelPlural: "Use Case Diagrams",
    placeholder: "Booking System",
    badge: "USE CASE",
    backLabel: "Use Case Diagram",
    description: "Model actors, system functions, and their relationships using standard UML notation.",
    icon: FiUsers,
    dataShape: "graph",
    hasDbType: false,
    exports: { png: false, sql: false, json: true },
  },
};

export const DIAGRAM_TYPE_LIST = Object.values(DIAGRAM_TYPES);

export const DEFAULT_DIAGRAM_TYPE = "erd";

export function getDiagramType(id) {
  return DIAGRAM_TYPES[id] ?? DIAGRAM_TYPES[DEFAULT_DIAGRAM_TYPE];
}

export function isGraphType(id) {
  return getDiagramType(id).dataShape === "graph";
}

export function isErdType(id) {
  return getDiagramType(id).dataShape === "tables";
}