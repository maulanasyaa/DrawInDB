import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReactFlow } from 'reactflow';
import { FiServer, FiGrid, FiLink, FiChevronDown } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';
import SidebarToggle from './SidebarToggle';
import { useVaultStore } from '../../store/vaultStore';

const PALETTE = [
  { kind: 'endpoint', name: 'Endpoint', icon: <FiServer className="w-5 h-5" />, desc: 'REST operation (method + path)' },
  { kind: 'schema', name: 'Schema', icon: <FiGrid className="w-5 h-5" />, desc: 'JSON schema of request/response' },
];

export default function ApiContractSidebar() {
  const { project } = useReactFlow();
  const addApiNode = useEditorStore((s) => s.addApiNode);
  const projectId = useEditorStore((s) => s._projectId);
  const currentVault = useVaultStore((s) => s.currentVault);

  const [erdDiagrams, setErdDiagrams] = useState([]);
  const [selectedErd, setSelectedErd] = useState('');
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const vaultPath = currentVault?.path;

  useEffect(() => {
    const diagrams = currentVault?.projects
      ?.find((p) => p.id === projectId)
      ?.diagrams?.filter((d) => d.type === 'erd');
    setErdDiagrams(diagrams || []);
    setSelectedErd('');
    setTables([]);
  }, [currentVault, projectId]);

  const centerOf = () => {
    const center = project({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const offset = Math.floor(Math.random() * 40);
    return { x: center.x + offset, y: center.y + offset };
  };

  const onDragStart = (event, kind) => {
    event.dataTransfer.setData('application/reactflow', kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onClickPalette = (kind) => addApiNode(kind, centerOf());

  const loadErdTables = useCallback(
    async (filename) => {
      if (!vaultPath || !projectId || !filename) {
        setTables([]);
        return;
      }
      setLoadingTables(true);
      try {
        const filePath = await window.api.pathJoin(vaultPath, 'projects', projectId, 'diagrams', filename);
        const content = await window.api.readFile(filePath);
        const parsed = JSON.parse(content);
        setTables(parsed.tables || []);
      } catch (e) {
        console.error('Failed to load ERD tables:', e);
        setTables([]);
      } finally {
        setLoadingTables(false);
      }
    },
    [vaultPath, projectId],
  );

  const linkTable = (table) => {
    const erd = erdDiagrams.find((d) => d.filename === selectedErd);
    addApiNode('tableref', centerOf(), {
      erdFilename: selectedErd,
      tableId: table.id,
      tableName: table.data?.name || table.name || 'Table',
      erdName: erd?.name || 'ERD',
    });
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
          API Contract Elements
        </h2>
        <SidebarToggle />
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {PALETTE.map((item) => (
            <div
              key={item.kind}
              draggable
              onDragStart={(e) => onDragStart(e, item.kind)}
              onClick={() => onClickPalette(item.kind)}
              className="group flex flex-col items-center p-4 bg-base border border-theme rounded-xl cursor-grab active:cursor-grabbing hover:border-focus hover:shadow-sm hover-lift transition-all"
              title={`${item.desc} (Click or Drag)`}
            >
              <div className="text-muted group-hover:text-accent transition-colors mb-3 flex items-center justify-center h-6">
                {item.icon}
              </div>
              <span className="text-xs font-semibold text-primary">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-theme/50 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
            <FiLink className="text-accent" /> Link ERD Table
          </div>

          {erdDiagrams.length === 0 ? (
            <p className="text-[11px] text-muted">
              No ERD in this project yet. Create one first.
            </p>
          ) : (
            <>
              <div className="relative">
                <select
                  value={selectedErd}
                  onChange={(e) => {
                    setSelectedErd(e.target.value);
                    loadErdTables(e.target.value);
                  }}
                  className="w-full appearance-none bg-base border border-theme rounded-lg px-3 py-2 text-xs text-primary outline-none focus:border-focus"
                >
                  <option value="">Choose ERD…</option>
                  {erdDiagrams.map((d) => (
                    <option key={d.filename} value={d.filename}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none" />
              </div>

              <div className="mt-3 space-y-1">
                {loadingTables && <p className="text-[11px] text-muted">Loading tables…</p>}
                {!loadingTables && tables.length === 0 && selectedErd && (
                  <p className="text-[11px] text-muted">No tables in this ERD.</p>
                )}
                {!loadingTables &&
                  tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => linkTable(t)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-base border border-theme hover:border-focus hover:bg-surface-2 text-xs text-primary transition-colors"
                    >
                      {t.data?.name || t.name || 'Table'}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
