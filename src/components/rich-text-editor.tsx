"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, ListOrdered, Pilcrow, Quote, Redo2, Strikethrough, Undo2 } from "lucide-react";
import { SecondaryButton } from "@/components/buttons";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolButton({
  active,
  disabled,
  onClick,
  children
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <SecondaryButton
      type="button"
      className={`px-3 py-2 text-xs ${active ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </SecondaryButton>
  );
}

export function RichTextEditor({ value, onChange, placeholder = "Start writing" }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2]
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap"
      }
    },
    onUpdate({ editor: nextEditor }) {
      onChange(nextEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    const next = value || "<p></p>";

    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-3 bg-slate-50 rounded-t-2xl">
        <ToolButton active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow size={14} className="mr-1.5" /> Paragraph
        </ToolButton>
        <ToolButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} className="mr-1.5" /> Heading
        </ToolButton>
        <ToolButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} className="mr-1.5" /> Bold
        </ToolButton>
        <ToolButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} className="mr-1.5" /> Italic
        </ToolButton>
        <ToolButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} className="mr-1.5" /> Strike
        </ToolButton>
        <ToolButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} className="mr-1.5" /> Bullets
        </ToolButton>
        <ToolButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} className="mr-1.5" /> Numbered
        </ToolButton>
        <ToolButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} className="mr-1.5" /> Quote
        </ToolButton>
        <ToolButton disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} className="mr-1.5" /> Undo
        </ToolButton>
        <ToolButton disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} className="mr-1.5" /> Redo
        </ToolButton>
      </div>
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}