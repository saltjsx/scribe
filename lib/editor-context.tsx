"use client";

import { createContext, useContext, useState } from "react";
import type { Editor } from "@tiptap/react";

interface EditorContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  isNewEntry: boolean;
  setIsNewEntry: (isNew: boolean) => void;
  editMood: number;
  setEditMood: (mood: number) => void;
}

const EditorContext = createContext<EditorContextValue>({
  editor: null,
  setEditor: () => {},
  isEditing: false,
  setIsEditing: () => {},
  isNewEntry: false,
  setIsNewEntry: () => {},
  editMood: 7,
  setEditMood: () => {},
});

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [editMood, setEditMood] = useState(7);

  return (
    <EditorContext.Provider
      value={{
        editor,
        setEditor,
        isEditing,
        setIsEditing,
        isNewEntry,
        setIsNewEntry,
        editMood,
        setEditMood,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  return useContext(EditorContext);
}
