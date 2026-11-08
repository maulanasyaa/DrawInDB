import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';
import { useEditorStore } from '../../store/editorStore';
import { API_METHODS, API_METHOD_COLOR } from '../../config/apiContractTypes';

export default function EndpointNode({ id, data, selected }) {
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const commit = (patch) => updateNodeData(id, patch);

  const [path, setPath] = useState(data.path);
  const [summary, setSummary] = useState(data.summary);
  const [tags, setTags] = useState((data.tags || []).join(', '));

  useEffect(() => setPath(data.path), [data.path]);
  useEffect(() => setSummary(data.summary), [data.summary]);
  useEffect(() => setTags((data.tags || []).join(', ')), [data.tags]);

  const color = API_METHOD_COLOR(data.method);

  return (
    <div className="relative min-w-[240px] premium-card shadow-sm">
      <NodeResizer
        color="#8B5CF6"
        isVisible={selected}
        minWidth={240}
        minHeight={100}
        lineClassName="!border-transparent"
        handleClassName="w-2 h-2 bg-canvas border border-accent rounded-sm !z-50"
      />

      <div className="absolute inset-0 p-4 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-theme/50 gap-2">
          <select
            value={data.method}
            onChange={(e) => commit({ method: e.target.value })}
            className="text-xs font-mono font-bold px-2 py-1 rounded-md border border-theme bg-surface text-primary outline-none focus:border-focus"
            style={{ color, borderColor: `${color}66` }}
          >
            {API_METHODS.map((m) => (
              <option key={m.method} value={m.method}>
                {m.method}
              </option>
            ))}
          </select>
          <span className="text-[10px] uppercase tracking-widest text-muted">Endpoint</span>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center bg-base/30 border border-theme/30 rounded px-1.5 py-1 focus-within:border-focus transition-colors">
            <input
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                commit({ path: e.target.value });
              }}
              placeholder="/api/resource"
              className="flex-1 min-w-0 bg-transparent font-mono text-xs text-primary outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex items-center bg-base/30 border border-theme/30 rounded px-1.5 py-1 focus-within:border-focus transition-colors">
            <input
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                commit({ summary: e.target.value });
              }}
              placeholder="Summary"
              className="flex-1 min-w-0 bg-transparent text-xs text-primary outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex items-center bg-base/30 border border-theme/30 rounded px-1.5 py-1 focus-within:border-focus transition-colors">
            <input
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                commit({
                  tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                });
              }}
              placeholder="Tags (comma separated)"
              className="flex-1 min-w-0 bg-transparent text-xs text-muted outline-none placeholder:text-muted"
            />
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle id="req" type="source" position={Position.Right} style={{ top: '30%', background: color }} />
      <Handle id="res" type="source" position={Position.Right} style={{ top: '70%', background: '#a1a1aa' }} />
    </div>
  );
}
