// Sequence Diagram (UML): konstanta terpusat, bebas JSX.

export const SQ_PARTICIPANT_KINDS = ['participant', 'actor', 'database', 'external'];
export const SQ_MESSAGE_KINDS = ['sync', 'async', 'return', 'self'];

export const SQ_PARTICIPANT_KIND_LABELS = {
  participant: 'Participant',
  actor: 'Actor',
  database: 'Database',
  external: 'External',
};

export const SQ_MESSAGE_KIND_LABELS = {
  sync: 'Sync',
  async: 'Async',
  return: 'Return',
  self: 'Self',
};

export const SQ_DEFAULT_PARTICIPANT_KIND = 'participant';
export const SQ_DEFAULT_MESSAGE_KIND = 'sync';
export const SQ_DEFAULT_PARTICIPANT_NAME = 'Participant';
export const SQ_DEFAULT_MESSAGE_LABEL = 'Message';

/** Ukuran layout (px). Dipakai `utils/sequence.js` dan renderer SVG. */
export const SQ_LAYOUT = {
  PAD: 48,
  MIN_PITCH: 140,
  MIN_BOX_W: 120,
  BOX_H: 52,
  HEADER_GAP: 24,
  ROW_H: 44,
  TAIL_PAD: 24,
  SELF_W: 56,
  MIN_LIFELINE: 40,
  MIN_WIDTH: 480,
  MIN_HEIGHT: 280,
};
