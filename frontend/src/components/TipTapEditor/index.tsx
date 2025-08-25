import "./styles.css";

import { useState, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";

import {
  IndentableParagraph,
  IndentableHeading,
  Indentation,
} from "./extensions";

import { fileService } from "@/services/fileService";
import { Tab } from "@/types/files";

interface TipTapEditorProps {
  filePath: string | null;
  onFileSelect?: (filePath: string) => void;
  onActiveFileChange?: (filePath: string | null) => void;
}

export default function TipTapEditor({
  filePath,
  onActiveFileChange,
}: TipTapEditorProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [modifiedTabs, setModifiedTabs] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Disable default paragraph to use our custom one
        heading: false, // Disable default heading to use our custom one
      }),
      IndentableParagraph,
      IndentableHeading,
      Indentation, // Add our indentation extension
      Highlight,
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg shadow-sm resizable-image",
        },
        allowBase64: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (!activeTabId) return;

      const content = editor.getHTML();
      const text = editor.getText();

      // Update counts
      setWordCount(
        text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length,
      );
      setCharCount(text.length);

      // Mark the active tab as modified
      setModifiedTabs((prev) => new Set(prev).add(activeTabId));

      // Update the tab content
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, content } : tab,
        ),
      );
    },
  });

  // Image resize functionality
  useEffect(() => {
    if (!editor) return;

    const createResizeHandles = (image: HTMLImageElement) => {
      // Remove existing handles first
      const existingHandles = document.querySelectorAll(".resize-handle");

      existingHandles?.forEach((handle) => handle.remove());

      // Create a wrapper if it doesn't exist
      let wrapper = image.parentElement;

      if (!wrapper || !wrapper.classList.contains("image-wrapper")) {
        wrapper = document.createElement("div");
        wrapper.className = "image-wrapper";
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        image.parentNode?.insertBefore(wrapper, image);
        wrapper.appendChild(image);
      }

      // Create resize handles
      const handles = ["nw", "ne", "sw", "se"];

      handles.forEach((position) => {
        const handle = document.createElement("div");

        handle.className = `resize-handle ${position}`;
        handle.dataset.position = position;
        wrapper?.appendChild(handle);
      });
    };

    const removeResizeHandles = () => {
      const handles = document.querySelectorAll(".resize-handle");

      handles.forEach((handle) => handle.remove());
    };

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.tagName === "IMG") {
        // Remove handles from previously selected images
        removeResizeHandles();

        setSelectedImage(target as HTMLImageElement);
        target.classList.add("selected");
        createResizeHandles(target as HTMLImageElement);
      } else if (!target.classList.contains("resize-handle")) {
        // Deselect image when clicking elsewhere
        const selectedImages = document.querySelectorAll(
          ".resizable-image.selected",
        );

        selectedImages.forEach((img) => img.classList.remove("selected"));
        setSelectedImage(null);
        removeResizeHandles();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("resize-handle")) {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const wrapper = target.closest(".image-wrapper") as HTMLElement;
        const image = wrapper?.querySelector(
          ".resizable-image",
        ) as HTMLImageElement;

        if (image && wrapper) {
          setSelectedImage(image);

          const startX = e.clientX;
          const startWidth = image.offsetWidth;
          const startHeight = image.offsetHeight;
          const aspectRatio = startWidth / startHeight;

          const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;

            // Resize based on the handle position
            const handle = target as HTMLElement;
            const handlePosition = handle.dataset.position;

            let newWidth = startWidth;
            let newHeight = startHeight;

            if (handlePosition === "se") {
              // Bottom-right handle
              newWidth = Math.max(100, startWidth + deltaX);
              newHeight = newWidth / aspectRatio;
            } else if (handlePosition === "sw") {
              // Bottom-left handle
              newWidth = Math.max(100, startWidth - deltaX);
              newHeight = newWidth / aspectRatio;
            } else if (handlePosition === "ne") {
              // Top-right handle
              newWidth = Math.max(100, startWidth + deltaX);
              newHeight = newWidth / aspectRatio;
            } else if (handlePosition === "nw") {
              // Top-left handle
              newWidth = Math.max(100, startWidth - deltaX);
              newHeight = newWidth / aspectRatio;
            }

            image.style.width = `${newWidth}px`;
            image.style.height = `${newHeight}px`;
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            setIsResizing(false);
          };

          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }
      }
    };

    const editorElement = editor.view.dom;

    editorElement.addEventListener("click", handleImageClick);
    editorElement.addEventListener("mousedown", handleMouseDown);

    return () => {
      editorElement.removeEventListener("click", handleImageClick);
      editorElement.removeEventListener("mousedown", handleMouseDown);
      removeResizeHandles();
    };
  }, [editor]);

  // Image handling functions
  const handleImageUpload = (file: File) => {
    if (!editor) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result as string;

      if (result) {
        editor.chain().focus().setImage({ src: result }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImagePaste = async (event: ClipboardEvent) => {
    if (!editor) return;

    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      event.preventDefault();
      const file = imageItem.getAsFile();

      if (file) {
        handleImageUpload(file);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Custom indent/outdent functions using TipTap commands
  const handleIndent = () => {
    if (!editor) return;

    // If in list item → use sinkListItem
    if (editor.isActive("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();

      return;
    }

    // Otherwise → add indent to active block node
    const { $from } = editor.state.selection;
    const nodeType = $from.parent.type.name;
    const types = ["paragraph", "heading"];

    if (!types.includes(nodeType)) return;

    const attrs = $from.parent.attrs as any;
    const currentIndent = attrs.indent ?? 0;
    const next = Math.max(0, Math.min(8, currentIndent + 1));

    editor.chain().focus().updateAttributes(nodeType, { indent: next }).run();
  };

  const handleOutdent = () => {
    if (!editor) return;

    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();

      return;
    }

    const { $from } = editor.state.selection;
    const nodeType = $from.parent.type.name;
    const types = ["paragraph", "heading"];

    if (!types.includes(nodeType)) return;

    const attrs = $from.parent.attrs as any;
    const currentIndent = attrs.indent ?? 0;
    const next = Math.max(0, currentIndent - 1);

    editor.chain().focus().updateAttributes(nodeType, { indent: next }).run();
  };

  // Handle Ctrl+W keyboard shortcut
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tabs.length > 0) {
        e.preventDefault();
        e.returnValue = "";

        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [tabs, activeTabId]);

  // Image paste event listener
  useEffect(() => {
    if (!editor) return;

    const handlePaste = (event: ClipboardEvent) => {
      handleImagePaste(event);
    };

    document.addEventListener("paste", handlePaste);

    return () => document.removeEventListener("paste", handlePaste);
  }, [editor]);

  useEffect(() => {
    // Listener function for file deletion
    const handleDeleteEvent: EventListener = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;

      setTabs((prevTabs) => prevTabs.filter((tab) => tab.path !== detail));
    };

    // Listener function for file rename
    const handleRenameEvent: EventListener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ oldPath: string; newPath: string }>
      ).detail;

      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.path === detail.oldPath
            ? {
                ...tab,
                path: detail.newPath,
                name: detail.newPath.split("/").pop() || "",
              }
            : tab,
        ),
      );
    };

    // Register listeners
    window.addEventListener("file-deleted", handleDeleteEvent);
    window.addEventListener("file-renamed", handleRenameEvent);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("file-deleted", handleDeleteEvent);
      window.removeEventListener("file-renamed", handleRenameEvent);
    };
  }, []);

  // Add new file to tabs when filePath changes
  useEffect(() => {
    if (!filePath || !editor) return;

    const addTab = async () => {
      try {
        const response = await fileService.getFileContent(filePath);
        const fileName = filePath.split("/").pop() || "";
        const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newTab: Tab = {
          id: tabId,
          path: filePath,
          name: fileName,
          content: response.content,
          isActive: true,
        };

        setTabs((prevTabs) => {
          // Check if file is already open
          const existingTabIndex = prevTabs.findIndex(
            (tab) => tab.path === filePath,
          );

          if (existingTabIndex !== -1) {
            // File already open, just activate it
            const updatedTabs = prevTabs.map((tab) => ({
              ...tab,
              isActive: tab.id === prevTabs[existingTabIndex].id,
            }));

            setActiveTabId(prevTabs[existingTabIndex].id);
            editor.commands.setContent(prevTabs[existingTabIndex].content);

            return updatedTabs;
          } else {
            // New file, add to tabs
            const updatedTabs = prevTabs.map((tab) => ({
              ...tab,
              isActive: false,
            }));

            setActiveTabId(tabId);
            editor.commands.setContent(response.content);

            return [...updatedTabs, newTab];
          }
        });
      } catch {
        // Handle error silently for now
      }
    };

    addTab();
  }, [filePath, editor]);

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);

    if (!tab || !editor) return;

    setTabs((prevTabs) =>
      prevTabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
    );
    setActiveTabId(tabId);
    editor.commands.setContent(tab.content);
  };

  const handleTabClose = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (modifiedTabs.has(tabId)) {
      const confirm = window.confirm(
        "You have unsaved changes. Are you sure you want to close this tab?",
      );

      if (!confirm) {
        return;
      }
    }

    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

      if (updatedTabs.length === 0) {
        setActiveTabId(null);
        setModifiedTabs(new Set());
        editor?.commands.setContent("");

        return [];
      }

      // If closing active tab, activate the next available tab
      if (tabId === activeTabId) {
        const nextActiveTab = updatedTabs[updatedTabs.length - 1];

        setActiveTabId(nextActiveTab.id);
        editor?.commands.setContent(nextActiveTab.content);

        return updatedTabs.map((tab) => ({
          ...tab,
          isActive: tab.id === nextActiveTab.id,
        }));
      }

      return updatedTabs;
    });

    // Remove the closed tab from modified tabs
    setModifiedTabs((prev) => {
      const newSet = new Set(prev);

      newSet.delete(tabId);

      return newSet;
    });
  };

  const handleSaveFile = async () => {
    if (!activeTabId || !activeTab) return;

    setIsSaving(true);
    try {
      await fileService.saveFile(activeTab.path, activeTab.content);

      // Remove the tab from modified tabs after successful save
      setModifiedTabs((prev) => {
        const newSet = new Set(prev);

        newSet.delete(activeTabId);

        return newSet;
      });
    } catch {
      // You could add error handling/notification here
    } finally {
      setIsSaving(false);
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Notify parent component when active file changes
  useEffect(() => {
    onActiveFileChange?.(activeTab?.path || null);
  }, [activeTab?.path, onActiveFileChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }

      // Full screen toggle on F11
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullScreen(!isFullScreen);
      }

      // Exit full screen on Escape
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveFile, isFullScreen]);

  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Empty Tab Bar */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center">
          <span className="text-sm text-gray-500">No documents open</span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-700">
              No documents open
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Select a document from the explorer to start writing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white relative ${isFullScreen ? "fullscreen" : ""}`}
    >
      {isSaving && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        type="file"
        onChange={handleFileSelect}
      />

      {/* Tab Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center overflow-x-auto scrollbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-3 border-r border-gray-200 cursor-pointer transition-colors ${
                tab.isActive
                  ? "bg-white text-gray-900 border-b-2 border-blue-500"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTabClick(tab.id);
                }
              }}
            >
              <svg
                className="w-4 h-4 text-blue-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  fillRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium truncate max-w-32">
                {tab.name}
                {modifiedTabs.has(tab.id) && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </span>
              <button
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={(e) => handleTabClose(tab.id, e)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            </button>
          ))}

          {/* Save Button */}
          {modifiedTabs.size > 0 && (
            <div className="ml-auto px-4 py-2">
              <button
                className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                title="Save file (Ctrl+S)"
                onClick={handleSaveFile}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button
            className={`toolbar-button ${editor?.isActive("bold") ? "active" : ""}`}
            title="Bold (Ctrl+B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("italic") ? "active" : ""}`}
            title="Italic (Ctrl+I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("strike") ? "active" : ""}`}
            title="Strike"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("highlight") ? "active" : ""}`}
            title="Highlight"
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          >
            <mark>H</mark>
          </button>

          <div className="toolbar-divider" />

          <button
            className={`toolbar-button ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}
            title="Heading 1"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
            title="Heading 2"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("heading", { level: 3 }) ? "active" : ""}`}
            title="Heading 3"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </button>

          <div className="toolbar-divider" />

          <button
            className={`toolbar-button ${editor?.isActive("bulletList") ? "active" : ""}`}
            title="Bullet List"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            •
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("orderedList") ? "active" : ""}`}
            title="Numbered List"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1.
          </button>

          <div className="toolbar-divider" />

          <button
            className="toolbar-button"
            title="Indent (Tab)"
            onClick={handleIndent}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
          <button
            className="toolbar-button"
            title="Outdent (Shift+Tab)"
            onClick={handleOutdent}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>

          <div className="toolbar-divider" />

          {/* Text Alignment Buttons */}
          <button
            className={`toolbar-button ${editor?.isActive({ textAlign: "left" }) ? "active" : ""}`}
            title="Align Left"
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M4 12h10M4 18h6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
          <button
            className={`toolbar-button ${editor?.isActive({ textAlign: "center" }) ? "active" : ""}`}
            title="Align Center"
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M7 12h10M9 18h6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
          <button
            className={`toolbar-button ${editor?.isActive({ textAlign: "right" }) ? "active" : ""}`}
            title="Align Right"
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M10 12h10M14 18h6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>

          <div className="toolbar-divider" />

          {/* Image Upload Button */}
          <button
            className="toolbar-button"
            title="Insert Image (Ctrl+V for paste)"
            onClick={triggerImageUpload}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>

          <button
            className={`toolbar-button ${editor?.isActive("codeBlock") ? "active" : ""}`}
            title="Code Block"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            &lt;/&gt;
          </button>
          <button
            className={`toolbar-button ${editor?.isActive("blockquote") ? "active" : ""}`}
            title="Quote"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            &quot;
          </button>
        </div>

        <div className="toolbar-right">
          <div className="editor-stats">
            <span className="stat-item">{wordCount} words</span>
            <span className="stat-item">{charCount} chars</span>
          </div>

          <button
            className="fullscreen-toggle"
            title={
              isFullScreen
                ? "Exit Full Screen (ESC)"
                : "Enter Full Screen (F11)"
            }
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
            {isFullScreen ? "⛶" : "⛶"}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="h-full p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
