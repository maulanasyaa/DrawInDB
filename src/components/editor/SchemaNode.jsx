import React from 'react';
import { Handle, Position } from 'reactflow';
import { useEditorStore } from '../../store/editorStore';
import { FiPlus, FiX } from 'react-icons/fi';

const makeFieldId = () => `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function FieldRow({ field, onChange, onRemove }) {
  return (
    <div className="group flex items-center gap-2 py-1">
      <input
        value={field.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="field"
        className="flex-1 min-w-0 bg-transparent font-mono text-xs text-primary border-b border-theme outline-none focus:border-accent"
      />
      <input
        value={field.type}
        onChange={(e) => onChange({ type: e.target.value })}
        placeholder="string"
        className="w-16 bg-transparent font-mono text-xs text-muted border-b border-theme outline-none focus:border-accent"
      />
      <label className="flex items-center gap-1 text-[10px] text-muted select-none">
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
        className="text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
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
          className="font-display text-base font-medium text-primary bg-transparent border-b border-theme outline-none focus:border-accent w-full"
        />
        <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">Schema</span>
      </div>

      <div className="px-4 py-2">
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
