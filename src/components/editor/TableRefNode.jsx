import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiDatabase } from 'react-icons/fi';

export default function TableRefNode({ data }) {
  return (
    <div className="min-w-44 premium-card px-3 py-2 flex items-center gap-2 shadow-sm">
      <FiDatabase className="text-accent shrink-0" />
      <div className="min-w-0">
        <div className="font-medium text-sm text-primary truncate">{data.tableName || 'Table'}</div>
        <div className="text-[10px] text-muted truncate">{data.erdName || 'ERD reference'}</div>
      </div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}
