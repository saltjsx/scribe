"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CaretLeft,
  PencilSimple,
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  Quotes,
  ArrowUUpLeft,
  ArrowUUpRight,
  Check,
  Trash,
  FloppyDisk,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useWebHaptics } from "web-haptics/react";
import { useTheme } from "@/lib/theme-context";
import { useEditorContext } from "@/lib/editor-context";
import { useEntries } from "@/lib/entries-context";

function ToolbarButton({
  active,
  onClick,
  children,
  haptic,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  haptic: ReturnType<typeof useWebHaptics>;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        haptic.trigger("light");
        onClick();
      }}
      className={`flex items-center justify-center rounded-md h-[30px] w-[30px] transition-colors duration-100 ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "text-[var(--foreground)] hover:bg-[var(--subtle)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-[18px] w-[0.5px] bg-[var(--divider)] mx-0.5" />;
}

function EditorToolbar({ editor, haptic }: { editor: NonNullable<ReturnType<typeof useEditorContext>["editor"]>; haptic: ReturnType<typeof useWebHaptics> }) {
  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <TextUnderline size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <TextStrikethrough size={15} weight="bold" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        haptic={haptic}
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quotes size={15} weight="bold" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton haptic={haptic} onClick={() => editor.chain().focus().undo().run()}>
        <ArrowUUpLeft size={15} weight="bold" />
      </ToolbarButton>
      <ToolbarButton haptic={haptic} onClick={() => editor.chain().focus().redo().run()}>
        <ArrowUUpRight size={15} weight="bold" />
      </ToolbarButton>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isEntry = pathname.startsWith("/app/entry/");
  const isNew = pathname === "/app/new";
  const isEntries = pathname === "/app/entries";
  const showBack = isEntry || isNew || isEntries;
  const { editor, isEditing, setIsEditing, editMood } = useEditorContext();
  const { addEntry, updateEntry, deleteEntry, isHydrated, syncStatus, syncMessage, syncNow } = useEntries();
  const haptic = useWebHaptics();
  const { resolvedTheme, setTheme } = useTheme();

  const entryId = isEntry ? pathname.split("/app/entry/")[1] : null;

  const handleSaveNewEntry = () => {
    if (!editor) return;
    const html = editor.getHTML();
    haptic.trigger("success");
    addEntry(editMood, html);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    haptic.trigger("warning");
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!entryId) return;
    haptic.trigger("error");
    setShowDeleteConfirm(false);
    void deleteEntry(entryId);
  };

  const showToolbar = (isEntry || isNew) && isEditing && editor;
  const syncTone =
    syncStatus === "error"
      ? "text-red-500"
      : syncStatus === "syncing"
        ? "text-sky-600"
        : "text-[var(--muted)]";
  const syncLabel =
    syncStatus === "loading"
      ? "Loading local vault"
      : syncStatus === "syncing"
        ? "Syncing"
        : syncStatus === "error"
          ? (syncMessage ?? "Sync failed")
          : "Saved locally";

  return (
    <header
      className="flex h-[48px] shrink-0 items-center bg-[var(--background)] px-2 md:px-4"
      style={{ borderBottom: "0.5px solid var(--divider)" }}
    >
      {/* Back button — mobile only */}
      {showBack && (
        <button
          onClick={() => { haptic.trigger("light"); router.back(); }}
          className="flex md:hidden items-center gap-0.5 rounded-md px-1 py-1 text-[var(--accent)] active:bg-[var(--subtle)] shrink-0 mr-1"
        >
          <CaretLeft size={18} weight="bold" />
          <span className="text-[14px] font-medium">Back</span>
        </button>
      )}

      {/* Toolbar — scrollable on mobile */}
      {showToolbar && (
        <div className="overflow-x-auto scrollbar-none">
          <EditorToolbar editor={editor} haptic={haptic} />
        </div>
      )}

      <div className="flex-1 min-w-0" />

      {/* Theme toggle — mobile only */}
      <button
        onClick={() => { haptic.trigger("selection"); setTheme(resolvedTheme === "dark" ? "light" : "dark"); }}
        className="flex md:hidden items-center justify-center rounded-md h-[30px] w-[30px] text-[var(--muted)] hover:bg-[var(--subtle)] transition-colors mr-1 shrink-0"
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
      </button>

      {/* Sync status — hidden on mobile when toolbar is showing to save space */}
      <div className={`mr-2 md:mr-3 flex items-center gap-2 shrink-0 ${showToolbar ? "hidden md:flex" : "flex"}`}>
        <div className={`max-w-[280px] truncate text-[12px] ${syncTone}`} title={syncMessage ?? undefined}>
          {syncLabel}
        </div>
        {syncStatus === "error" && isHydrated && (
          <button
            onClick={() => { haptic.trigger("light"); void syncNow(); }}
            className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Retry
          </button>
        )}
      </div>

      {/* New entry — save button */}
      {isNew && (
        <button
          onClick={() => void handleSaveNewEntry()}
          disabled={!isHydrated || !editor}
          className="flex items-center gap-1.5 rounded-md px-3 py-[5px] text-[13px] font-medium text-emerald-600 transition-colors duration-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
        >
          <FloppyDisk size={14} weight="bold" />
          Save
        </button>
      )}

      {/* Existing entry — delete + edit/done */}
      {isEntry && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            disabled={!isHydrated}
            className="flex items-center gap-1.5 rounded-md px-2 md:px-3 py-[5px] text-[13px] font-medium text-red-500 transition-colors duration-100 hover:bg-red-500/10"
          >
            <Trash size={14} weight="bold" />
            <span className="hidden md:inline">Delete</span>
          </button>
          <button
            onClick={() => void (async () => {
              haptic.trigger("light");
              if (isEditing && editor && entryId) {
                await updateEntry(entryId, editMood, editor.getHTML());
              }
              setIsEditing(!isEditing);
            })()}
            disabled={!isHydrated}
            className={`flex items-center gap-1.5 rounded-md px-2 md:px-3 py-[5px] text-[13px] font-medium transition-colors duration-100 ${
              isEditing
                ? "text-emerald-600 hover:bg-emerald-500/10"
                : "text-[var(--accent)] hover:bg-[var(--subtle)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isEditing ? (
              <>
                <Check size={14} weight="bold" />
                Done
              </>
            ) : (
              <>
                <PencilSimple size={14} weight="bold" />
                Edit
              </>
            )}
          </button>
        </div>
      )}
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--divider)] px-6 py-5 max-w-[320px] w-full">
            <h3 className="text-[15px] font-semibold text-[var(--foreground)] mb-1">Delete Entry</h3>
            <p className="text-[13px] text-[var(--muted)] mb-5">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md px-3.5 py-[6px] text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--subtle)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md px-3.5 py-[6px] text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
