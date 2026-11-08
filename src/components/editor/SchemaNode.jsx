import React from 'react';
import { Handle, Position } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { FiPlus, FiX, FiChevronDown } from 'react-icons/fi';

const makeFieldId = () => `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const SCHEMA_TYPE_OPTIONS = [
  'string',
  'integer',
  'number',
  'boolean',
  'object',
  'array',
  'null',
  'date-time',
  'uuid',
  'email',
];

function FieldRow({ field, onChange, onRemove }) {
  const [typeMenuOpen, setTypeMenuOpen] = React.useState(false);
  const blurTimer = React.useRef(null);
  const openTypeMenu = () => {
    clearTimeout(blurTimer.current);
    setTypeMenuOpen(true);
  };
  const closeTypeMenu = () => {
    blurTimer.current = setTimeout(() => setTypeMenuOpen(false), 120);
  };
  return (
    <div className="group flex items-center gap-2 px-2.5 py-1.5 bg-base border border-theme rounded-lg hover:border-focus focus-within:border-accent transition-colors">
      <input
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="field"
        className="flex-1 min-w-0 bg-transparent font-mono text-xs text-primary outline-none placeholder:text-muted"
      />
      <div className="relative">
        <input
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value })}
          placeholder="string"
          onFocus={openTypeMenu}
          onBlur={closeTypeMenu}
          className="w-20 bg-transparent font-mono text-xs text-muted outline-none placeholder:text-muted pr-5"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (typeMenuOpen ? setTypeMenuOpen(false) : openTypeMenu())}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
        >
          <FiChevronDown className="text-xs" />
        </button>
        {typeMenuOpen && (
          <div className="absolute z-30 top-full right-0 mt-1 w-36 bg-surface border border-theme rounded-lg shadow-xl overflow-hidden py-1">
            {SCHEMA_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ type: opt });
                  setTypeMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs font-mono text-primary hover:bg-hover"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="flex items-center gap-1 text-[10px] text-muted select-none shrink-0">
        <input
          type="checkbox"
          checked={!!field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="accent-accent"
        />
        req
      </label>
      <button
        onClick={onRemove}
        className="text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity shrink-0"
      >
        <FiX className="text-sm" />
      </button>
    </div>
  );
}

export default function SchemaNode({ id, data }) {
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const commit = (patch) => updateNodeData(id, patch);
  const fields = data.fields || [];

  const updateField = (fid, patch) =>
    commit({ fields: fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });

  const removeField = (fid) => commit({ fields: fields.filter((f) => f.id !== fid) });

  const addField = () =>
    commit({ fields: [...fields, { id: makeFieldId(), name: '', type: 'string', required: false }] });

  return (
    <div className="min-w-60 premium-card shadow-sm">
      <div className="px-4 py-3 border-b border-theme/50 flex items-center justify-between gap-2">
        <input
          value={data.name}
          onChange={(e) => commit({ name: e.target.value })}
          placeholder="Schema"
          className="font-display text-base font-medium text-primary bg-base border border-theme rounded-lg px-2.5 py-1.5 outline-none focus:border-accent w-full placeholder:text-muted"
        />
        <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">Schema</span>
      </div>

      <div className="px-4 py-2 space-y-1.5">
        {fields.length === 0 && (
          <p className="text-[11px] text-muted py-1">No fields yet.</p>
        )}
        {fields.map((f) => (
          <FieldRow
            key={f.id}
            field={f}
            onChange={(patch) => updateField(f.id, patch)}
            onRemove={() => removeField(f.id)}
          />
        ))}
        <button
          onClick={addField}
          className="mt-1 flex items-center gap-1 text-[11px] text-accent hover:text-primary transition-colors"
        >
          <FiPlus /> Add field
        </button>
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
