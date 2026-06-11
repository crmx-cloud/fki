import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StickyNote, Pin, PinOff, Trash2, Edit3, Plus, X, Check,
  Bold, Italic, Strikethrough, Underline, List, ListOrdered, Link,
  MoreHorizontal, Clock, User,
} from "lucide-react";

// ── Note Colors (dark-themed) ──────────────────────────────

const NOTE_COLORS = {
  yellow: { bg: "bg-amber-500/[0.08]", border: "border-amber-500/20", header: "bg-amber-500/[0.12]", dot: "bg-amber-400" },
  blue: { bg: "bg-sky-500/[0.08]", border: "border-sky-500/20", header: "bg-sky-500/[0.12]", dot: "bg-sky-400" },
  red: { bg: "bg-rose-500/[0.08]", border: "border-rose-500/20", header: "bg-rose-500/[0.12]", dot: "bg-rose-400" },
  green: { bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/20", header: "bg-emerald-500/[0.12]", dot: "bg-emerald-400" },
  purple: { bg: "bg-violet-500/[0.08]", border: "border-violet-500/20", header: "bg-violet-500/[0.12]", dot: "bg-violet-400" },
} as const;

type NoteColor = keyof typeof NOTE_COLORS;

// ── Color Picker ───────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: NoteColor; onChange: (c: NoteColor) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-5 h-5 rounded-full transition-all ${NOTE_COLORS[color].dot} ${value === color ? "ring-2 ring-offset-1 ring-offset-slate-950 ring-slate-400 scale-110" : "opacity-70 hover:opacity-100"}`}
          title={color}
        />
      ))}
    </div>
  );
}

// ── Note Card (dark theme) ─────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  note: any;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const color = (note.color || "yellow") as NoteColor;
  const colors = NOTE_COLORS[color];

  const createdDate = new Date(note.createdAt);
  const wasEdited = note.updatedAt - note.createdAt > 60000;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl transition-all hover:shadow-md group`}>
      {/* Header */}
      <div className={`${colors.header} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          {note.isPinned && <Pin className="w-3 h-3 text-slate-400 shrink-0" />}
          <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
            <User className="w-3 h-3" />
            {note.creatorName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5" />
            {createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {wasEdited && " (edited)"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[160px] bg-slate-900 border-white/10"
            >
              <DropdownMenuItem
                onClick={onEdit}
                className="text-slate-300 focus:bg-white/5 focus:text-slate-200"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onTogglePin}
                className="text-slate-300 focus:bg-white/5 focus:text-slate-200"
              >
                {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {note.isPinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                onClick={onDelete}
                variant="destructive"
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Content */}
      <div className="px-3 py-2.5">
        {note.richContent ? (
          <div
            className="text-sm text-slate-200 [&_a]:text-cyan-400 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-0.5 [&_b]:font-bold [&_i]:italic [&_u]:underline [&_strike]:line-through"
            dangerouslySetInnerHTML={{ __html: note.richContent }}
          />
        ) : (
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{note.content}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Notes Panel ───────────────────────────────────────

export default function NotesPanel({ contactId }: { contactId: Id<"crmLeads"> }) {
  const notes = useQuery(api.notes.listByContact, { contactId }) || [];
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const togglePin = useMutation(api.notes.togglePin);
  const deleteNote = useMutation(api.notes.deleteNote);

  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHtml, setEditingHtml] = useState("");
  const [noteColor, setNoteColor] = useState<NoteColor>("yellow");
  const [saving, setSaving] = useState(false);

  const resetComposer = () => {
    setShowComposer(false);
    setEditingId(null);
    setEditingHtml("");
    setNoteColor("yellow");
  };

  const handleSave = async () => {
    const editorEl = document.querySelector("[data-notes-editor]") as HTMLDivElement | null;
    if (!editorEl) return;

    const html = editorEl.innerHTML || "";
    const text = editorEl.innerText?.trim() || "";
    if (!text) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateNote({
          noteId: editingId as Id<"contactNotes">,
          content: text,
          richContent: html,
          color: noteColor,
        });
      } else {
        await createNote({
          contactId,
          content: text,
          richContent: html,
          color: noteColor,
        });
      }
      resetComposer();
    } catch (e: any) {
      alert(e.message || "Failed to save note");
    }
    setSaving(false);
  };

  const handleEdit = (note: any) => {
    setEditingId(note._id);
    setEditingHtml(note.richContent || note.content || "");
    setNoteColor(note.color || "yellow");
    setShowComposer(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote({ noteId: noteId as Id<"contactNotes"> });
    } catch (e: any) {
      alert(e.message || "Failed to delete note");
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin({ noteId: noteId as Id<"contactNotes"> });
    } catch (e: any) {
      alert(e.message || "Failed to pin note");
    }
  };

  const pinnedNotes = notes.filter((n: any) => n.isPinned);
  const unpinnedNotes = notes.filter((n: any) => !n.isPinned);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-white">Notes</h3>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0 rounded bg-white/5 text-slate-500 font-medium">
              {notes.length}
            </span>
          )}
        </div>
        {!showComposer && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingHtml(""); setShowComposer(true); }}
            className="h-6 text-[11px] border-white/10 text-slate-400 hover:text-white hover:bg-white/5 gap-1"
          >
            <Plus className="w-3 h-3" /> Add Note
          </Button>
        )}
      </div>

      {/* Composer */}
      {showComposer && (
        <div className={`${NOTE_COLORS[noteColor].bg} ${NOTE_COLORS[noteColor].border} border rounded-xl p-3 space-y-3`}>
          <div className="flex items-center justify-between">
            <ColorPicker value={noteColor} onChange={setNoteColor} />
            <button type="button" onClick={resetComposer} className="p-1 rounded hover:bg-white/10">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <NoteEditor
            key={editingId || "new"}
            initialHtml={editingHtml}
            placeholder="Write a note..."
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={resetComposer} className="h-7 text-xs text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 text-xs gap-1 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Check className="w-3 h-3" />
              {saving ? "Saving..." : editingId ? "Save" : "Add Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showComposer && (
        <div className="text-center py-8">
          <StickyNote className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          <p className="text-sm text-slate-500">No notes yet</p>
          <p className="text-xs text-slate-600">Add a note to keep track of this contact</p>
        </div>
      )}

      {/* Pinned section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <Pin className="w-3 h-3" /> Pinned
          </div>
          {pinnedNotes.map((note: any) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={() => handleEdit(note)}
              onTogglePin={() => handleTogglePin(note._id)}
              onDelete={() => handleDelete(note._id)}
            />
          ))}
        </div>
      )}

      {/* Regular notes */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              All Notes
            </div>
          )}
          {unpinnedNotes.map((note: any) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={() => handleEdit(note)}
              onTogglePin={() => handleTogglePin(note._id)}
              onDelete={() => handleDelete(note._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Note Editor (dark theme, self-contained) ───────────────

function NoteEditor({
  initialHtml,
  placeholder,
}: {
  initialHtml: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialHtml);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml || "";
      setIsEmpty(!initialHtml);
      if (initialHtml) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      editorRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    checkEmpty();
  };

  const checkEmpty = () => {
    const text = editorRef.current?.innerText?.trim() || "";
    setIsEmpty(text.length === 0);
  };

  const addLink = () => {
    const sel = window.getSelection();
    const hasSelection = sel && sel.toString().length > 0;
    const url = prompt("Enter URL:");
    if (!url) return;
    editorRef.current?.focus();
    if (hasSelection) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${url}" target="_blank" rel="noopener" style="color:#22d3ee;text-decoration:underline">${url}</a>&nbsp;`
      );
    }
    checkEmpty();
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/50">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.06] bg-white/[0.02] flex-wrap">
        <ToolbarBtn icon={Bold} title="Bold" onAction={() => exec("bold")} />
        <ToolbarBtn icon={Italic} title="Italic" onAction={() => exec("italic")} />
        <ToolbarBtn icon={Strikethrough} title="Strikethrough" onAction={() => exec("strikeThrough")} />
        <ToolbarBtn icon={Underline} title="Underline" onAction={() => exec("underline")} />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarBtn icon={List} title="Bullet list" onAction={() => exec("insertUnorderedList")} />
        <ToolbarBtn icon={ListOrdered} title="Numbered list" onAction={() => exec("insertOrderedList")} />
        <ToolbarBtn icon={Link} title="Insert link" onAction={addLink} />
      </div>
      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute inset-0 p-3 text-sm text-slate-500 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          data-notes-editor="true"
          contentEditable
          suppressContentEditableWarning
          dir="ltr"
          className="min-h-[100px] max-h-[240px] overflow-y-auto p-3 text-sm text-slate-200 focus:outline-none [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1 [&_li]:mb-0.5 [&_a]:text-cyan-400 [&_a]:underline [&_b]:font-bold [&_i]:italic [&_u]:underline [&_strike]:line-through [&_br]:block"
          onInput={checkEmpty}
          onBlur={checkEmpty}
          style={{ direction: "ltr", textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        />
      </div>
    </div>
  );
}

// ── Toolbar Button ─────────────────────────────────────────

function ToolbarBtn({
  icon: Icon,
  title,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onAction: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onAction();
      }}
      className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
      title={title}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
