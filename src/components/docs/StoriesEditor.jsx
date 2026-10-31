import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowDown,
  FiArrowUp,
  FiLink,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useDocStore } from "../../store/docStore";
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "../../utils/prd";

const cell =
  "w-full bg-base border border-theme rounded-md px-2 py-1.5 text-xs text-primary focus:outline-none focus:border-focus transition-all";

/**
 * Badge tautan diagram. `readOnly` dipakai preview: tanpa tombol hapus/tambah,
 * tapi tautan tetap bisa diklik dan tautan rusak tetap ditandai.
 */
export function DiagramLinks({ projectId, project, links, onChange, readOnly = false }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");

  const diagrams = project?.diagrams || [];
  const byFile = new Map(diagrams.map((d) => [d.filename, d]));

  const add = () => {
    const diagram = byFile.get(target);
    if (!diagram) return;
    onChange([...links, { diagramFile: diagram.filename, diagramType: diagram.type, note }]);
    setTarget("");
    setNote("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {links.map((link) => {
          const diagram = byFile.get(link.diagramFile);
          const remove = readOnly ? null : (
            <button
              onClick={() =>
                onChange(links.filter((l) => l.diagramFile !== link.diagramFile))
              }
              title="Remove link"
              className="text-muted hover:text-danger"
            >
              <FiX className="text-[10px]" />
            </button>
          );

          if (!diagram) {
            return (
              <span
                key={link.diagramFile}
                title={`Missing diagram: ${link.diagramFile}`}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-danger/40 bg-danger/10 text-danger"
              >
                Diagram missing
                {remove}
              </span>
            );
          }

          return (
            <span
              key={link.diagramFile}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-theme bg-surface-2 text-primary"
            >
              <button
                onClick={() => navigate(`/editor/${projectId}/${diagram.filename}`)}
                title={`Open ${diagram.name}`}
                className="hover:underline"
              >
                {diagram.name}
              </button>
              {remove}
            </span>
          );
        })}

        {!readOnly && (
          <button
            onClick={() => setAdding((v) => !v)}
            title="Link a diagram"
            className="w-5 h-5 flex items-center justify-center rounded-full border border-theme text-muted hover:text-primary hover:border-focus"
          >
            {links.length ? <FiLink className="text-[10px]" /> : <FiPlus className="text-[10px]" />}
          </button>
        )}
      </div>

      {!readOnly && adding && (
        <div className="flex flex-col gap-1 mt-1">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={cell}
          >
            <option value="">Select diagram…</option>
            {diagrams.map((d) => (
              <option key={d.filename} value={d.filename}>
                {d.name} ({d.type})
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={cell}
          />
          <div className="flex gap-1">
            <button onClick={add} disabled={!target} className="btn-primary !py-1 !px-3 !text-[10px] disabled:opacity-50">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary !py-1 !px-3 !text-[10px]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tabel user stories: edit inline, tanpa mode terpisah. */
export default function StoriesEditor({ project }) {
  const stories = useDocStore((state) => state.doc?.stories) || [];
  const addStory = useDocStore((state) => state.addStory);
  const updateStory = useDocStore((state) => state.updateStory);
  const deleteStory = useDocStore((state) => state.deleteStory);
  const moveStory = useDocStore((state) => state.moveStory);
  const setStoryLinks = useDocStore((state) => state.setStoryLinks);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-widest text-muted text-left">
              <th className="py-2 pr-2 min-w-24">Actor</th>
              <th className="py-2 pr-2 min-w-32">I want</th>
              <th className="py-2 pr-2 min-w-32">So that</th>
              <th className="py-2 pr-2 w-[110px]">Priority</th>
              <th className="py-2 pr-2 w-[110px]">Status</th>
              <th className="py-2 pr-2 min-w-32">Diagrams</th>
              <th className="py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {stories.map((story, index) => (
              <tr key={story.id} className="border-t border-theme/50 align-top">
                <td className="py-2 pr-2 min-w-24">
                  <input
                    value={story.actor}
                    onChange={(e) => updateStory(story.id, { actor: e.target.value })}
                    placeholder="Buyer"
                    className={cell}
                  />
                </td>
                <td className="py-2 pr-2 min-w-32">
                  <input
                    value={story.want}
                    onChange={(e) => updateStory(story.id, { want: e.target.value })}
                    placeholder="pay with a card"
                    className={cell}
                  />
                </td>
                <td className="py-2 pr-2 min-w-32">
                  <input
                    value={story.benefit}
                    onChange={(e) => updateStory(story.id, { benefit: e.target.value })}
                    placeholder="I finish checkout quickly"
                    className={cell}
                  />
                </td>
                {/* Priority & Status: lebar tetap supaya "Should"/"Won't" tidak
                    terpotong jadi "Sh"/"W" saat tabel menyempit. */}
                <td className="py-2 pr-2 w-[110px]">
                  <select
                    value={story.priority}
                    onChange={(e) => updateStory(story.id, { priority: e.target.value })}
                    className={`${cell} min-w-[110px]`}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2 w-[110px]">
                  <select
                    value={story.status}
                    onChange={(e) => updateStory(story.id, { status: e.target.value })}
                    className={`${cell} min-w-[110px]`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2 min-w-32">
                  <DiagramLinks
                    projectId={project?.id}
                    project={project}
                    links={story.links || []}
                    onChange={(links) => setStoryLinks(story.id, links)}
                  />
                </td>
                <td className="py-2 w-20 whitespace-nowrap">
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => moveStory(story.id, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="w-6 h-6 shrink-0 flex items-center justify-center text-muted hover:text-primary disabled:opacity-30"
                    >
                      <FiArrowUp className="text-xs" />
                    </button>
                    <button
                      onClick={() => moveStory(story.id, 1)}
                      disabled={index === stories.length - 1}
                      title="Move down"
                      className="w-6 h-6 shrink-0 flex items-center justify-center text-muted hover:text-primary disabled:opacity-30"
                    >
                      <FiArrowDown className="text-xs" />
                    </button>
                    <button
                      onClick={() => deleteStory(story.id)}
                      title="Delete story"
                      className="w-6 h-6 shrink-0 flex items-center justify-center text-muted hover:text-danger"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stories.length === 0 && (
        <p className="text-sm text-muted italic">No user stories yet.</p>
      )}

      <div>
        <button onClick={() => addStory()} className="btn-secondary !py-1.5 !px-4 !text-xs flex items-center gap-2">
          <FiPlus /> Add story
        </button>
      </div>
    </div>
  );
}
