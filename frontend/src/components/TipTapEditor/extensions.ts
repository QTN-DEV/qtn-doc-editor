import { Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";

// Indentable Paragraph Extension
export const IndentableParagraph = Paragraph.extend({
  addAttributes() {
    return {
      indent: {
        default: 0,
        renderHTML: (attrs: any) => {
          const lvl = Math.max(0, Math.min(8, attrs.indent ?? 0)); // clamp

          return lvl ? { style: `margin-left: ${lvl * 2}em;` } : {};
        },
        parseHTML: (element: any) => {
          const ml = element.style.marginLeft || "";
          const match = ml.match(/(\d+(?:\.\d+)?)em/);

          return { indent: match ? Math.round(Number(match[1]) / 2) : 0 };
        },
      },
    };
  },
});

// Indentable Heading Extension
export const IndentableHeading = Heading.extend({
  addAttributes() {
    return {
      indent: {
        default: 0,
        renderHTML: (attrs: any) => {
          const lvl = Math.max(0, Math.min(8, attrs.indent ?? 0));

          return lvl ? { style: `margin-left: ${lvl * 2}em;` } : {};
        },
      },
    };
  },
});

// Indentation Extension with keyboard shortcuts
export const Indentation = Extension.create({
  name: "indentation",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { editor } = this;

        if (!editor) return false;

        // If in list item → use sinkListItem
        if (editor.isActive("listItem")) {
          return editor.chain().sinkListItem("listItem").run();
        }

        // Otherwise → add indent to active block node
        const { $from } = editor.state.selection;
        const nodeType = $from.parent.type.name;
        const types = ["paragraph", "heading"];

        if (!types.includes(nodeType)) return false;

        const attrs = $from.parent.attrs as any;
        const currentIndent = attrs.indent ?? 0;
        const next = Math.max(0, Math.min(8, currentIndent + 1));

        return editor
          .chain()
          .updateAttributes(nodeType, { indent: next })
          .run();
      },

      "Shift-Tab": () => {
        const { editor } = this;

        if (!editor) return false;

        if (editor.isActive("listItem")) {
          return editor.chain().liftListItem("listItem").run();
        }

        const { $from } = editor.state.selection;
        const nodeType = $from.parent.type.name;
        const types = ["paragraph", "heading"];

        if (!types.includes(nodeType)) return false;

        const attrs = $from.parent.attrs as any;
        const currentIndent = attrs.indent ?? 0;
        const next = Math.max(0, currentIndent - 1);

        return editor
          .chain()
          .updateAttributes(nodeType, { indent: next })
          .run();
      },
    };
  },
});
