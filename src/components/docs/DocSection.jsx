import React, { useState } from "react";
import { useDocStore } from "../../store/docStore";
import { STORY_SECTION_KEY, sectionToMarkdown } from "../../utils/prd";
import CopyButton from "../CopyButton";
import MarkdownPreview from "./MarkdownPreview";
import StoriesEditor from "./StoriesEditor";

const toggleBtn = (active) =>
  `px-2 py-1 rounded-full transition-all ${
    active ? "bg-surface-2 text-primary" : "text-muted hover:text-primary"
  }`;

/** Satu section PRD: judul bisa diubah, isi markdown, toggle Edit/Preview. */
export default function DocSection({ section, project }) {
  const setSectionContent = useDocStore((state) => state.setSectionContent);
  const setSectionTitle = useDocStore((state) => state.setSectionTitle);
  const stories = useDocStore((state) => state.doc?.stories) || [];
  const [preview, setPreview] = useState(false);

  const isStories = section.key === STORY_SECTION_KEY;

  return (
    <section className="premium-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <input
          value={section.title}
          onChange={(e) => setSectionTitle(section.id, e.target.value)}
          className="flex-1 min-w-0 bg-transparent font-display text-xl text-primary outline-none border-b border-transparent focus:border-focus transition-colors"
        />

        <div className="flex items-center gap-1 shrink-0">
          <CopyButton
            text={sectionToMarkdown(section, stories)}
            title={`Copy "${section.title}" as markdown`}
          />

          {!isStories && (
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-theme rounded-full p-0.5">
              <button onClick={() => setPreview(false)} className={toggleBtn(!preview)}>
                Edit
              </button>
              <button onClick={() => setPreview(true)} className={toggleBtn(preview)}>
                Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {isStories ? (
        <StoriesEditor project={project} />
      ) : preview ? (
        <div className="min-h-16">
          <MarkdownPreview text={section.content} />
        </div>
      ) : (
        <textarea
          value={section.content}
          onChange={(e) => setSectionContent(section.id, e.target.value)}
          rows={6}
          placeholder="Write markdown… (# heading, **bold**, - list, `code`)"
          className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-sm text-primary font-mono leading-relaxed focus:outline-none focus:border-focus transition-all resize-y"
        />
      )}
    </section>
  );
}
