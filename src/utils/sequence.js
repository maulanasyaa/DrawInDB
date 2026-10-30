// Model + layout Sequence Diagram. Murni: tanpa DOM, bisa jalan di
// environment `node` (test) dan dipakai renderer serta exporter.

import {
  SQ_PARTICIPANT_KINDS,
  SQ_MESSAGE_KINDS,
  SQ_DEFAULT_PARTICIPANT_KIND,
  SQ_DEFAULT_MESSAGE_KIND,
  SQ_LAYOUT,
} from '../config/sequenceTypes';

const PREFIX = 'Sequence: ';

const str = (v) => (typeof v === 'string' ? v : '');

/**
 * Bentuk kanonik { participants, messages, options }. Tahan file rusak:
 * entri non-objek dibuang, field hilang diisi, enum tak dikenal di-coerce,
 * id kosong diisi. Idempotent. Pesan yang merujuk peserta hilang SENGAJA
 * dipertahankan supaya nomor urut tidak bergeser.
 */
export function normalizeSequence(data = {}) {
  const rawParticipants = Array.isArray(data?.participants) ? data.participants : [];
  const participants = rawParticipants
    .filter((p) => p && typeof p === 'object')
    .map((p, i) => ({
      id: str(p.id) || `p-${i}`,
      name: str(p.name),
      kind: SQ_PARTICIPANT_KINDS.includes(p.kind) ? p.kind : SQ_DEFAULT_PARTICIPANT_KIND,
    }));

  const rawMessages = Array.isArray(data?.messages) ? data.messages : [];
  const messages = rawMessages
    .filter((m) => m && typeof m === 'object')
    .map((m, i) => ({
      id: str(m.id) || `m-${i}`,
      from: str(m.from),
      to: str(m.to),
      label: str(m.label),
      kind: SQ_MESSAGE_KINDS.includes(m.kind) ? m.kind : SQ_DEFAULT_MESSAGE_KIND,
    }));

  const rawOptions = data?.options && typeof data.options === 'object' ? data.options : {};
  return {
    participants,
    messages,
    options: { showNumbers: rawOptions.showNumbers === true },
  };
}

/** Template awal diagram baru. */
export function emptySequence() {
  return normalizeSequence({});
}

/**
 * Estimasi lebar teks tanpa DOM. Karakter CJK dihitung satu em penuh,
 * sisanya ~0.56 em (rata-rata font sans).
 */
export function estimateTextWidth(text, fontSize = 13) {
  let width = 0;
  for (const ch of String(text)) {
    width += ch.charCodeAt(0) > 0x2e80 ? fontSize : fontSize * 0.56;
  }
  return width;
}

/**
 * Layout otomatis. Mengembalikan koordinat piksel yang dipakai renderer,
 * exporter (ukuran PNG), dan test.
 *
 * @returns {{
 *   width: number, height: number, pitch: number, boxWidth: number,
 *   lifelineTop: number, lifelineBottom: number,
 *   participants: Array<{id,name,kind,x,width}>,
 *   messages: Array<{id,from,to,label,kind,index,y,x1,x2,self,unresolved}>
 * }}
 */
export function layoutSequence(data = {}, { measure = estimateTextWidth } = {}) {
  const { participants, messages } = normalizeSequence(data);
  const L = SQ_LAYOUT;
  const lifelineTop = L.BOX_H;

  if (participants.length === 0) {
    return {
      width: L.MIN_WIDTH,
      height: L.MIN_HEIGHT,
      pitch: L.MIN_PITCH,
      boxWidth: L.MIN_BOX_W,
      lifelineTop,
      lifelineBottom: lifelineTop + L.MIN_LIFELINE,
      participants: [],
      messages: [],
    };
  }

  const boxWidth = Math.max(
    L.MIN_BOX_W,
    ...participants.map((p) => measure(p.name, 13) + 32),
  );
  const pitch = Math.max(L.MIN_PITCH, boxWidth + 48);
  const hasSelf = messages.some((m) => m.from === m.to && m.from !== '');

  const columns = participants.map((p, i) => ({
    ...p,
    x: L.PAD + boxWidth / 2 + i * pitch,
    width: boxWidth,
  }));
  const xById = new Map(columns.map((p) => [p.id, p.x]));

  const firstRowY = lifelineTop + L.HEADER_GAP;
  const rows = messages.map((m, index) => {
    const y = firstRowY + index * L.ROW_H;
    const x1 = xById.get(m.from);
    const x2 = xById.get(m.to);
    const unresolved = x1 === undefined || x2 === undefined;
    const self = !unresolved && m.from === m.to;

    return {
      ...m,
      index,
      y,
      x1: unresolved ? null : x1,
      // Self-message digambar sebagai loop di kanan garis hidup.
      x2: unresolved ? null : self ? x1 + L.SELF_W : x2,
      self,
      unresolved,
    };
  });

  const lastY = rows.length > 0 ? rows[rows.length - 1].y : lifelineTop;
  // Diagram tanpa pesan tetap butuh garis hidup yang terlihat.
  const lifelineBottom = Math.max(lastY + L.TAIL_PAD, lifelineTop + L.MIN_LIFELINE);
  const lastX = columns[columns.length - 1].x;

  return {
    width: Math.max(
      L.MIN_WIDTH,
      lastX + boxWidth / 2 + L.PAD + (hasSelf ? L.SELF_W : 0),
    ),
    height: Math.max(L.MIN_HEIGHT, lifelineBottom + L.PAD),
    pitch,
    boxWidth,
    lifelineTop,
    lifelineBottom,
    participants: columns,
    messages: rows,
  };
}

/**
 * Peringatan ringan (bukan blokir). Semua pesan berprefix "Sequence: "
 * mengikuti pola `architectureValidation.js`.
 *
 * @returns {{ participantWarnings: Record<string,string>, messageWarnings: Record<string,string> }}
 */
export function validateSequence(data = {}) {
  const { participants, messages } = normalizeSequence(data);
  const ids = new Set(participants.map((p) => p.id));
  const participantWarnings = {};
  const messageWarnings = {};
  const used = new Set();

  messages.forEach((m, i) => {
    const no = i + 1;
    if (!m.label.trim()) {
      messageWarnings[m.id] = `${PREFIX}Message ${no} has no label`;
    }
    if (!ids.has(m.from) || !ids.has(m.to)) {
      messageWarnings[m.id] = `${PREFIX}Message ${no} references an unknown participant`;
    }
    used.add(m.from);
    used.add(m.to);
  });

  for (const p of participants) {
    if (!used.has(p.id)) {
      participantWarnings[p.id] = `${PREFIX}${p.name || 'Participant'} has no messages`;
    }
  }

  return { participantWarnings, messageWarnings };
}
