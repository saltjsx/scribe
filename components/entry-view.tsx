"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Smiley } from "@phosphor-icons/react";
import { useEditorContext } from "@/lib/editor-context";
import type { Entry } from "@/lib/entries";
import { moodLabel, moodColor } from "@/lib/entries";
import MoodSlider from "./mood-slider";

export default function EntryView({ entry }: { entry: Entry }) {
  const { isEditing, setEditor, setIsEditing, editMood, setEditMood } = useEditorContext();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: entry.body,
    editable: isEditing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none",
      },
    },
  });

  // Sync editor instance to context
  useEffect(() => {
    setEditor(editor);
    return () => setEditor(null);
  }, [editor, setEditor]);

  // Toggle editable when isEditing changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        editor.commands.focus("end");
      }
    }
  }, [isEditing, editor]);

  // Reset editing state when entry changes
  useEffect(() => {
    setIsEditing(false);
    setEditMood(entry.mood);
    if (editor) {
      editor.commands.setContent(entry.body);
    }
  }, [editor, entry.body, entry.id, entry.mood, setEditMood, setIsEditing]);

  return (
    <div className="flex flex-col px-4 md:px-10 py-6 md:py-8 max-w-[680px] mx-auto">
      {/* Date as title */}
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[var(--foreground)] leading-tight mb-2">
        {entry.date}
      </h1>

      {/* Mood — static display or slider */}
      {isEditing ? (
        <div className="mb-8 mt-2">
          <MoodSlider value={editMood} onChange={setEditMood} />
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 text-[13px] mb-8"
          style={{ color: moodColor(entry.mood) }}
        >
          <Smiley size={14} weight="fill" />
          {moodLabel(entry.mood)} · {entry.mood}/10
        </div>
      )}

      {/* Editor / Read view */}
      <EditorContent editor={editor} />
    </div>
  );
}
