import React from 'react';
import EndpointNode from './EndpointNode';
import SchemaNode from './SchemaNode';
import TableRefNode from './TableRefNode';

/** Dispatcher: satu nodeTypes per tipe diagram, tampilan dipilih via data.kind. */
export default function ApiNode(props) {
  const kind = props.data?.kind;
  if (kind === 'endpoint') return <EndpointNode {...props} />;
  if (kind === 'schema') return <SchemaNode {...props} />;
  if (kind === 'tableref') return <TableRefNode {...props} />;
  return <EndpointNode {...props} />;
}
