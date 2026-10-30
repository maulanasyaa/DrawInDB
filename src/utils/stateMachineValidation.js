// Validasi ringan State Machine (peringatan visual, bukan blokir aksi).
// Pure: dipakai node (badge) dan test.

import { SM_NODE_TYPES } from '../config/stateMachineTypes';

/**
 * @returns {{ nodeWarnings: Record<string, string>, edgeWarnings: Record<string, string> }}
 */
export function validateStateMachine(nodes = [], edges = []) {
  const nodeWarnings = {};
  const edgeWarnings = {};

  const initialCount = nodes.filter((n) => n.data?.type === SM_NODE_TYPES.INITIAL).length;
  if (initialCount > 1) {
    for (const n of nodes) {
      if (n.data?.type === SM_NODE_TYPES.INITIAL) {
        nodeWarnings[n.id] = 'State machine has more than one initial state';
      }
    }
  }

  const inbound = new Set(edges.map((e) => e.target));
  const outbound = new Set(edges.map((e) => e.source));

  for (const n of nodes) {
    const subtype = n.data?.type;
    if (subtype === SM_NODE_TYPES.STATE) {
      // Self-transition dihitung sebagai masuk sekaligus keluar.
      if (!outbound.has(n.id) && !inbound.has(n.id)) {
        nodeWarnings[n.id] = 'State has no incoming or outgoing transitions';
      }
    } else if (subtype === SM_NODE_TYPES.FINAL) {
      if (outbound.has(n.id)) {
        nodeWarnings[n.id] = 'Final state cannot have outgoing transitions';
      }
    }
  }

  for (const e of edges) {
    const from = nodes.find((n) => n.id === e.source);
    if (from?.data?.type === SM_NODE_TYPES.FINAL) {
      edgeWarnings[e.id] = 'Transition leaves a final state';
    }
  }

  return { nodeWarnings, edgeWarnings };
}
