import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useVaultStore } from "../store/vaultStore";
import { SiMysql, SiPostgresql, SiSqlite } from "react-icons/si";
import { FiFileText } from "react-icons/fi";

const DB_TYPES = [
  { id: "mysql", name: "MySQL", icon: <SiMysql />, desc: "MySQL or MariaDB" },
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: <SiPostgresql />,
    desc: "Advanced open source RDBMS",
  },
  {
    id: "sqlite",
    name: "SQLite",
    icon: <SiSqlite />,
    desc: "Lightweight local database",
  },
  {
    id: "generic",
    name: "Generic",
    icon: <FiFileText />,
    desc: "Export to any SQL flavor",
  },
];

export default function NewDiagramModal({ onClose }) {
  const [name, setName] = useState("");
  const [dbType, setDbType] = useState("mysql");
  const createDiagram = useVaultStore((state) => state.createDiagram);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!name.trim()) return;
    try {
      const filename = await createDiagram(name, dbType);
      if (filename) {
        navigate(`/editor/${filename}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create diagram: " + e.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-2xl p-10 shadow-2xl animate-pop-in flex flex-col gap-10">
        <div>
          <h2 className="font-display section-title text-primary mb-2">
            New Diagram
          </h2>
          <p className="text-secondary font-light">
            Create a new schema in your vault.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-primary">
            Diagram Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-primary focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus transition-all"
            placeholder="e.g. E-commerce Core"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-primary">
            Database Engine
          </label>
          <div className="grid grid-cols-2 gap-4">
            {DB_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => setDbType(type.id)}
                className={`p-4 border rounded-xl cursor-pointer transition-all hover-lift ${
                  dbType === type.id
                    ? "border-primary ring-1 ring-primary bg-surface shadow-sm"
                    : "border-theme bg-base hover:border-focus"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl opacity-80">{type.icon}</span>
                  <span className="font-medium text-primary tracking-tight">
                    {type.name}
                  </span>
                </div>
                <div className="text-xs text-muted leading-relaxed">
                  {type.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-theme/50">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            Create Diagram
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
