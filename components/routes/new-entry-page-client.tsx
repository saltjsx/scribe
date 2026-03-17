"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditorContext } from "@/lib/editor-context";
import MoodSlider from "@/components/mood-slider";

export default function NewEntryPageClient() {
  const { setEditor, setIsEditing, setIsNewEntry, editMood, setEditMood } =
    useEditorContext();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "How was your day?" }),
    ],
    content: "",
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none",
      },
    },
  });

  useEffect(() => {
    setEditor(editor);
    setIsEditing(true);
    setIsNewEntry(true);
    setEditMood(7);

    return () => {
      setEditor(null);
      setIsEditing(false);
      setIsNewEntry(false);
    };
  }, [editor, setEditor, setIsEditing, setIsNewEntry, setEditMood]);

  return (
    <div className="mx-auto flex max-w-[680px] flex-col px-4 py-6 md:px-10 md:py-8">
      <h1 className="mb-2 text-[28px] leading-tight font-semibold tracking-[-0.01em] text-[var(--foreground)]">
        {today}
      </h1>

      <div className="mb-8 mt-2">
        <MoodSlider value={editMood} onChange={setEditMood} />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
