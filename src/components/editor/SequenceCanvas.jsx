import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiMinus, FiMaximize2 } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import { layoutSequence, validateSequence } from '../../utils/sequence';
import { SQ_LAYOUT } from '../../config/sequenceTypes';

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

/** Warna dari CSS var yang sudah ada (resolver export memakai whitelist itu). */
const C = {
  text: 'var(--text-primary)',
  border: 'var(--border)',
  focus: 'var(--border-focus)',
  surface: 'var(--bg-surface)',
  base: 'var(--bg-base)',
  warn: 'var(--warning)',
};

const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

function ParticipantShape({ p, boxWidth }) {
  const x = p.x - boxWidth / 2;
  const stroke = { stroke: C.text, strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' };
  const nameY = p.kind === 'actor' ? SQ_LAYOUT.BOX_H - 6 : SQ_LAYOUT.BOX_H / 2 + 4;

  const label = (
    <text x={p.x} y={nameY} textAnchor="middle" fill={C.text} fontSize="12" fontWeight="600">
      {p.name || 'Untitled'}
    </text>
  );

  if (p.kind === 'actor') {
    const cx = p.x;
    return (
      <>
        <g fill="none" {...stroke}>
          <circle cx={cx} cy={11} r={5} />
          <line x1={cx} y1={16} x2={cx} y2={26} />
          <line x1={cx - 8} y1={20} x2={cx + 8} y2={20} />
          <line x1={cx} y1={26} x2={cx - 6} y2={34} />
          <line x1={cx} y1={26} x2={cx + 6} y2={34} />
        </g>
        {label}
      </>
    );
  }

  if (p.kind === 'database') {
    const rx = boxWidth / 2;
    const ry = 8;
    return (
      <>
        <path
          d={`M ${x} ${ry} L ${x} ${SQ_LAYOUT.BOX_H - ry} A ${rx} ${ry} 0 0 0 ${x + boxWidth} ${SQ_LAYOUT.BOX_H - ry} L ${x + boxWidth} ${ry}`}
          fill={C.surface}
          {...stroke}
        />
        <ellipse cx={p.x} cy={ry} rx={rx} ry={ry} fill={C.surface} {...stroke} />
        {label}
      </>
    );
  }

  // participant & external sama-sama kotak; external dibedakan garis putus-putus.
  return (
    <>
      <rect
        x={x}
        y={0}
        width={boxWidth}
        height={SQ_LAYOUT.BOX_H}
        rx={4}
        fill={p.kind === 'external' ? C.base : C.surface}
        stroke={C.text}
        strokeWidth={1.5}
        strokeDasharray={p.kind === 'external' ? '5 4' : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {label}
    </>
  );
}

export default function SequenceCanvas() {
  const participants = useEditorStore((state) => state.participants);
  const messages = useEditorStore((state) => state.messages);
  const options = useEditorStore((state) => state.sequenceOptions);
  const selected = useEditorStore((state) => state.selectedSequenceItem);
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen);

  const setSelected = useEditorStore((state) => state.setSelectedSequenceItem);
  const updateParticipant = useEditorStore((state) => state.updateSequenceParticipant);
  const updateMessage = useEditorStore((state) => state.updateSequenceMessage);
  const deleteParticipant = useEditorStore((state) => state.deleteSequenceParticipant);
  const deleteMessage = useEditorStore((state) => state.deleteSequenceMessage);

  const [scale, setScale] = useState(1);
  const [editing, setEditing] = useState(null); // { type, id }
  const scrollRef = useRef(null);

  const layout = layoutSequence({ participants, messages, options });
  const warnings = validateSequence({ participants, messages });

  const removeSelected = () => {
    if (!selected) return;
    if (selected.type === 'participant') deleteParticipant(selected.id);
    else deleteMessage(selected.id);
  };
  const removeRef = useRef(removeSelected);
  removeRef.current = removeSelected;

  // Delete/Backspace: satu klik cukup. Diabaikan saat fokus di input/textarea.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target?.closest?.('input,textarea,select,[contenteditable]')) return;
      if (!useEditorStore.getState().selectedSequenceItem) return;
      e.preventDefault();
      removeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Ctrl/Cmd+wheel: listener native (onWheel React passive, preventDefault gagal).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setScale((v) => clampScale(v + (e.deltaY > 0 ? -0.1 : 0.1)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const markerFor = (kind) =>
    kind === 'sync' ? 'url(#seq-arrow-filled)' : 'url(#seq-arrow-open)';
  const isSelected = (type, id) => selected?.type === type && selected?.id === id;

  const w = layout.width * scale;
  const h = layout.height * scale;

  return (
    <div className="flex-1 relative flex overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto custom-scrollbar bg-canvas"
        style={{ paddingLeft: isSidebarOpen ? 320 : 0 }}
        onClick={() => setSelected(null)}
      >
        <svg
          data-sequence-canvas
          width={w}
          height={h}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block"
        >
          <defs>
            <marker
              id="seq-arrow-filled"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={C.text} />
            </marker>
            <marker
              id="seq-arrow-open"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={C.text} strokeWidth="1.5" />
            </marker>
          </defs>

          {/* Garis hidup */}
          {layout.participants.map((p) => (
            <line
              key={`ll-${p.id}`}
              x1={p.x}
              y1={layout.lifelineTop + SQ_LAYOUT.BOX_H}
              x2={p.x}
              y2={layout.lifelineBottom}
              stroke={C.border}
              strokeWidth={1}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Kotak peserta */}
          {layout.participants.map((p) => (
            <g
              key={p.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelected({ type: 'participant', id: p.id });
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing({ type: 'participant', id: p.id });
              }}
              style={{ cursor: 'pointer' }}
            >
              {isSelected('participant', p.id) && (
                <rect
                  className="seq-ui"
                  x={p.x - layout.boxWidth / 2 - 3}
                  y={-3}
                  width={layout.boxWidth + 6}
                  height={SQ_LAYOUT.BOX_H + 6}
                  rx={6}
                  fill="none"
                  stroke={C.focus}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <ParticipantShape p={p} boxWidth={layout.boxWidth} />
              {warnings.participantWarnings[p.id] && (
                <g className="seq-ui">
                  <circle
                    cx={p.x + layout.boxWidth / 2 - 6}
                    cy={6}
                    r={6}
                    fill={C.warn}
                    stroke={C.base}
                    strokeWidth={1}
                  >
                    <title>{warnings.participantWarnings[p.id]}</title>
                  </circle>
                  <text x={p.x + layout.boxWidth / 2 - 6} y={9} textAnchor="middle" fontSize="8" fill={C.base}>
                    !
                  </text>
                </g>
              )}
              {editing?.type === 'participant' && editing.id === p.id && (
                <foreignObject
                  x={p.x - layout.boxWidth / 2}
                  y={SQ_LAYOUT.BOX_H + 4}
                  width={layout.boxWidth}
                  height={24}
                >
                  <input
                    autoFocus
                    value={p.name}
                    onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                    className="w-full bg-surface border border-focus rounded px-1 text-[12px] text-primary text-center outline-none"
                  />
                </foreignObject>
              )}
            </g>
          ))}

          {/* Pesan */}
          {layout.messages.map((m) => {
            if (m.unresolved) return null;
            const midX = m.self ? m.x1 + SQ_LAYOUT.SELF_W / 2 : (m.x1 + m.x2) / 2;
            const label = m.label?.trim();
            const display = options.showNumbers ? `${m.index + 1}. ${label}` : label;
            const warn = warnings.messageWarnings[m.id];
            const active = isSelected('message', m.id);
            const warnX = m.self ? m.x2 + 10 : m.x2 + (m.x2 > m.x1 ? 12 : -12);

            return (
              <g
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected({ type: 'message', id: m.id });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditing({ type: 'message', id: m.id });
                }}
                style={{ cursor: 'pointer' }}
              >
                {m.self ? (
                  <path
                    d={`M ${m.x1} ${m.y - 8} H ${m.x2} V ${m.y + 8} H ${m.x1}`}
                    fill="none"
                    stroke={active ? C.focus : C.text}
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={m.kind === 'return' ? '5 4' : undefined}
                    markerEnd={markerFor(m.kind)}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <line
                    x1={m.x1}
                    y1={m.y}
                    x2={m.x2}
                    y2={m.y}
                    stroke={active ? C.focus : C.text}
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={m.kind === 'return' ? '5 4' : undefined}
                    markerEnd={markerFor(m.kind)}
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {display && editing?.id !== m.id && (
                  <>
                    <rect
                      x={midX - display.length * 3.4 - 4}
                      y={m.y - 26}
                      width={display.length * 6.8 + 8}
                      height={18}
                      fill={C.base}
                      rx={3}
                    />
                    <text x={midX} y={m.y - 13} textAnchor="middle" fill={C.text} fontSize="11">
                      {display}
                    </text>
                  </>
                )}

                {warn && (
                  <g className="seq-ui">
                    <circle cx={warnX} cy={m.y - 6} r={6} fill={C.warn} stroke={C.base} strokeWidth={1}>
                      <title>{warn}</title>
                    </circle>
                    <text x={warnX} y={m.y - 3} textAnchor="middle" fontSize="8" fill={C.base}>
                      !
                    </text>
                  </g>
                )}

                {editing?.type === 'message' && editing.id === m.id && (
                  <foreignObject x={midX - 80} y={m.y - 30} width={160} height={24}>
                    <input
                      autoFocus
                      value={m.label}
                      onChange={(e) => updateMessage(m.id, { label: e.target.value })}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                      className="w-full bg-surface border border-focus rounded px-1 text-[11px] text-primary text-center outline-none"
                    />
                  </foreignObject>
                )}
              </g>
            );
          })}

          {participants.length === 0 && (
            <text
              x={layout.width / 2}
              y={layout.height / 2}
              textAnchor="middle"
              fill={C.text}
              fontSize="13"
              opacity="0.6"
            >
              Add participants in the panel to start.
            </text>
          )}
        </svg>
      </div>

      {/* Kontrol zoom — UI, dibuang saat export. */}
      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-surface border border-theme rounded-lg shadow-lg p-1">
        <button
          type="button"
          onClick={() => setScale((s) => clampScale(s - 0.1))}
          className="p-1.5 text-muted hover:text-primary transition-colors"
          title="Zoom out"
        >
          <FiMinus />
        </button>
        <button
          type="button"
          onClick={() => setScale(1)}
          className="px-2 py-1 text-[10px] font-semibold text-muted hover:text-primary transition-colors"
          title="Reset zoom"
        >
          <FiMaximize2 className="inline" /> {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => clampScale(s + 0.1))}
          className="p-1.5 text-muted hover:text-primary transition-colors"
          title="Zoom in"
        >
          <FiPlus />
        </button>
      </div>
    </div>
  );
}
