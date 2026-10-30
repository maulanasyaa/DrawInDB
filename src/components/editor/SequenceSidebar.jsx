import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiCornerDownRight,
} from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import {
  SQ_PARTICIPANT_KINDS,
  SQ_MESSAGE_KINDS,
  SQ_PARTICIPANT_KIND_LABELS,
  SQ_MESSAGE_KIND_LABELS,
} from '../../config/sequenceTypes';

const INPUT =
  'w-full bg-base border border-theme rounded-md px-2 py-1 text-xs text-primary focus:outline-none focus:border-focus transition-colors';
const ICON_BTN =
  'text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-muted';

function Row({ children, active, itemKey }) {
  return (
    <div
      id={itemKey}
      className={`rounded-lg border p-2 flex flex-col gap-1.5 transition-colors ${
        active ? 'border-focus bg-surface-2' : 'border-theme bg-base'
      }`}
    >
      {children}
    </div>
  );
}

function OrderButtons({ onUp, onDown, canUp, canDown, onDelete, title }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button type="button" onClick={onUp} disabled={!canUp} className={ICON_BTN} title="Move up">
        <FiArrowUp className="text-xs" />
      </button>
      <button type="button" onClick={onDown} disabled={!canDown} className={ICON_BTN} title="Move down">
        <FiArrowDown className="text-xs" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-muted hover:text-danger transition-colors"
        title={title}
        aria-label={title}
      >
        <FiTrash2 className="text-xs" />
      </button>
    </div>
  );
}

export default function SequenceSidebar() {
  const participants = useEditorStore((state) => state.participants);
  const messages = useEditorStore((state) => state.messages);
  const options = useEditorStore((state) => state.sequenceOptions);
  const selected = useEditorStore((state) => state.selectedSequenceItem);

  const addParticipant = useEditorStore((state) => state.addSequenceParticipant);
  const updateParticipant = useEditorStore((state) => state.updateSequenceParticipant);
  const moveParticipant = useEditorStore((state) => state.moveSequenceParticipant);
  const deleteParticipant = useEditorStore((state) => state.deleteSequenceParticipant);

  const addMessage = useEditorStore((state) => state.addSequenceMessage);
  const updateMessage = useEditorStore((state) => state.updateSequenceMessage);
  const moveMessage = useEditorStore((state) => state.moveSequenceMessage);
  const deleteMessage = useEditorStore((state) => state.deleteSequenceMessage);

  const setSelected = useEditorStore((state) => state.setSelectedSequenceItem);
  const toggleNumbers = useEditorStore((state) => state.toggleSequenceNumbers);

  // Item terpilih (dari kanvas atau panel) di-scroll ke dalam view.
  const bodyRef = useRef(null);
  useEffect(() => {
    if (!selected) return;
    bodyRef.current?.querySelector(`#seq-item-${selected.id}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selected]);

  const selectedMessage = selected?.type === 'message' ? selected.id : null;

  const onAddMessage = () => {
    if (participants.length === 0) return;
    addMessage({}, selectedMessage);
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 left-0 bottom-0 w-[320px] bg-surface border-r border-theme flex flex-col z-20 shadow-2xl"
    >
      <div className="p-5 border-b border-theme/50 flex items-center justify-between bg-surface-2/30">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          Sequence Elements
        </h2>
        <label className="flex items-center gap-1.5 text-[10px] text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={options.showNumbers}
            onChange={toggleNumbers}
            className="accent-current"
          />
          Numbers
        </label>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6">
        {/* Participants */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.15em]">
              Participants ({participants.length})
            </h3>
            <button
              type="button"
              onClick={() => addParticipant()}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-accent transition-colors"
              title="Add participant"
            >
              <FiPlus /> Add
            </button>
          </div>

          {participants.length === 0 && (
            <p className="text-xs text-muted italic">Add a participant to start.</p>
          )}

          {participants.map((p, i) => (
            <Row
              key={p.id}
              itemKey={`seq-item-${p.id}`}
              active={selected?.type === 'participant' && selected.id === p.id}
            >
              <div className="flex items-center gap-1.5">
                <input
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                  onFocus={() => setSelected({ type: 'participant', id: p.id })}
                  placeholder="Name"
                  className={INPUT}
                />
                <OrderButtons
                  onUp={() => moveParticipant(p.id, -1)}
                  onDown={() => moveParticipant(p.id, 1)}
                  canUp={i > 0}
                  canDown={i < participants.length - 1}
                  onDelete={() => deleteParticipant(p.id)}
                  title="Delete participant"
                />
              </div>
              <select
                value={p.kind}
                onChange={(e) => updateParticipant(p.id, { kind: e.target.value })}
                className={INPUT}
              >
                {SQ_PARTICIPANT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SQ_PARTICIPANT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Row>
          ))}
        </section>

        {/* Messages */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.15em]">
              Messages ({messages.length})
            </h3>
            <button
              type="button"
              onClick={onAddMessage}
              disabled={participants.length === 0}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-accent transition-colors disabled:opacity-40 disabled:hover:text-muted"
              title={
                selectedMessage ? 'Add message after selected' : 'Add message at the end'
              }
            >
              <FiPlus /> Add
            </button>
          </div>

          {messages.length === 0 && (
            <p className="text-xs text-muted italic">
              {participants.length === 0
                ? 'Messages need at least one participant.'
                : 'No messages yet.'}
            </p>
          )}

          {messages.map((m, i) => {
            const active = selected?.type === 'message' && selected.id === m.id;
            return (
              <Row key={m.id} itemKey={`seq-item-${m.id}`} active={active}>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 shrink-0 text-[10px] font-bold text-muted text-right">
                    {i + 1}
                  </span>
                  <select
                    value={m.from}
                    onChange={(e) => updateMessage(m.id, { from: e.target.value })}
                    className={INPUT}
                    title="From"
                  >
                    {!participants.some((p) => p.id === m.from) && (
                      <option value={m.from}>unknown</option>
                    )}
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || 'Untitled'}
                      </option>
                    ))}
                  </select>
                  <FiCornerDownRight className="text-muted shrink-0" title="to" />
                  <select
                    value={m.to}
                    onChange={(e) => updateMessage(m.id, { to: e.target.value })}
                    className={INPUT}
                    title="To"
                  >
                    {!participants.some((p) => p.id === m.to) && (
                      <option value={m.to}>unknown</option>
                    )}
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || 'Untitled'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    value={m.label}
                    onChange={(e) => updateMessage(m.id, { label: e.target.value })}
                    onFocus={() => setSelected({ type: 'message', id: m.id })}
                    placeholder="Label"
                    className={INPUT}
                  />
                  <OrderButtons
                    onUp={() => moveMessage(m.id, -1)}
                    onDown={() => moveMessage(m.id, 1)}
                    canUp={i > 0}
                    canDown={i < messages.length - 1}
                    onDelete={() => deleteMessage(m.id)}
                    title="Delete message"
                  />
                </div>
                <select
                  value={m.kind}
                  onChange={(e) => updateMessage(m.id, { kind: e.target.value })}
                  className={INPUT}
                >
                  {SQ_MESSAGE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {SQ_MESSAGE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Row>
            );
          })}
        </section>
      </div>
    </motion.div>
  );
}
