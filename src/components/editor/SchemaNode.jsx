import React from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';
import { useEditorStore } from '../../store/editorStore';
import { FiPlus, FiX } from 'react-icons/fi';

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
  return (
    <div className="group flex items-center gap-2 px-2.5 py-1.5 bg-base border border-theme rounded-lg hover:border-focus focus-within:border-accent transition-colors">
      <input
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="field"
        className="flex-1 min-w-0 bg-transparent font-mono text-xs text-primary outline-none placeholder:text-muted"
      />
      <div className="flex items-center bg-base/30 border border-theme/30 rounded px-1.5 py-1 focus-within:border-focus transition-colors">
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="bg-transparent text-muted text-[11px] w-20 appearance-none cursor-pointer outline-none font-mono tracking-tight font-medium"
        >
          {[field.type, ...SCHEMA_TYPE_OPTIONS]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((t) => (
              <option key={t} value={t} className="bg-surface">
                {t}
              </option>
            ))}
        </select>
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

export default function SchemaNode({ id, data, selected }) {
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const commit = (patch) => updateNodeData(id, patch);
  const fields = data.fields || [];

  const updateField = (fid, patch) =>
    commit({ fields: fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });

  const removeField = (fid) => commit({ fields: fields.filter((f) => f.id !== fid) });

  const addField = () =>
    commit({ fields: [...fields, { id: makeFieldId(), name: '', type: 'string', required: false }] });

  return (
    <div className="relative min-w-[280px] premium-card shadow-sm">
      <NodeResizer
        color="#8B5CF6"
        isVisible={selected}
        minWidth={280}
        minHeight={120}
        lineClassName="!border-transparent"
        handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
      />

      <div className="absolute inset-0 p-4 flex flex-col">
        <div className="px-4 py-3 border-b border-theme/50 flex items-center justify-between gap-2">
          <input
            value={data.name}
            onChange={(e) => commit({ name: e.target.value })}
            placeholder="Schema"
            className="font-display text-base font-medium text-primary bg-base border border-theme rounded-lg px-2.5 py-1.5 outline-none focus:border-accent w-full placeholder:text-muted"
          />
          <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">Schema</span>
        </div>

        <div className="flex-1 overflow-auto space-y-1.5">
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
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
