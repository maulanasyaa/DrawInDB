import React from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STORY_SECTION_KEY,
} from "../../utils/prd";
import MarkdownPreview from "./MarkdownPreview";
import { DiagramLinks } from "./StoriesEditor";

/**
 * Tampilan baca seluruh dokumen. Read-only: tidak ada input, tidak ada
 * tombol hapus. Tautan diagram tetap bisa diklik lewat DiagramLinks readOnly
 * (yang rusak tetap ditandai), dan MarkdownPreview memakai renderer aman
 * yang sama dengan preview per section.
 */
export default function DocPreview({ doc, project }) {
  if (!doc) return null;

  const stories = doc.stories || [];

  return (
    <article className="max-w-3xl mx-auto px-10 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-theme pb-6">
        <h1 className="font-display section-title text-primary">{doc.meta?.name}</h1>
        {doc.meta?.updated_at && (
          <p className="text-xs text-muted">
            Updated {new Date(doc.meta.updated_at).toLocaleString()}
          </p>
        )}
      </header>

      {doc.sections.map((section) => {
        const isStories = section.key === STORY_SECTION_KEY;
        const hasContent = isStories || (section.content || "").trim();

        return (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-primary">{section.title}</h2>

            {isStories ? (
              <StoriesTable stories={stories} project={project} />
            ) : hasContent ? (
              <MarkdownPreview text={section.content} />
            ) : (
              <p className="text-sm text-muted italic">Not written yet.</p>
            )}
          </section>
        );
      })}
    </article>
  );
}

function StoriesTable({ stories, project }) {
  if (stories.length === 0) {
    return <p className="text-sm text-muted italic">No user stories yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-[9px] font-bold uppercase tracking-widest text-muted text-left">
            <th className="py-2 pr-3 min-w-24">Actor</th>
            <th className="py-2 pr-3 min-w-32">I want</th>
            <th className="py-2 pr-3 min-w-32">So that</th>
            <th className="py-2 pr-3 w-[90px]">Priority</th>
            <th className="py-2 pr-3 w-[90px]">Status</th>
            <th className="py-2 min-w-32">Diagrams</th>
          </tr>
        </thead>
        <tbody>
          {stories.map((story) => (
            <tr key={story.id} className="border-t border-theme/50 align-top">
              <td className="py-2 pr-3 text-primary">{story.actor || "—"}</td>
              <td className="py-2 pr-3 text-secondary">{story.want || "—"}</td>
              <td className="py-2 pr-3 text-secondary">{story.benefit || "—"}</td>
              <td className="py-2 pr-3 text-secondary whitespace-nowrap">
                {PRIORITY_LABELS[story.priority] || story.priority}
              </td>
              <td className="py-2 pr-3 text-secondary whitespace-nowrap">
                {STATUS_LABELS[story.status] || story.status}
              </td>
              <td className="py-2">
                <DiagramLinks
                  readOnly
                  projectId={project?.id}
                  project={project}
                  links={story.links || []}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
