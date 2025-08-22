import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

import { fileService } from "@/services/fileService";
import { Tab } from "@/types/files";

interface CodeEditorProps {
  filePath: string | null;
  onFileSelect: (filePath: string) => void;
  onActiveFileChange: (filePath: string | null) => void;
}

export default function CodeEditor({
  filePath,
  onActiveFileChange,
}: CodeEditorProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [modifiedTabs, setModifiedTabs] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Handle Ctrl+W keyboard shortcut
  useEffect(() => {
    // Prevent browser from closing the page/tab
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
    if (!filePath) return;

    const addTab = async () => {
      try {
        const response = await fileService.getFileContent(
          filePath,
        );
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

            return updatedTabs;
          } else {
            // New file, add to tabs
            const updatedTabs = prevTabs.map((tab) => ({
              ...tab,
              isActive: false,
            }));

            setActiveTabId(tabId);

            return [...updatedTabs, newTab];
          }
        });
      } catch {
        // Handle error silently for now
      }
    };

    addTab();
  }, [filePath]);

  const handleTabClick = (tabId: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
    );
    setActiveTabId(tabId);
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

        return [];
      }

      // If closing active tab, activate the next available tab
      if (tabId === activeTabId) {
        const nextActiveTab = updatedTabs[updatedTabs.length - 1];

        setActiveTabId(nextActiveTab.id);

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

  const handleContentChange = (value: string) => {
    if (!activeTabId) return;

    // Mark the active tab as modified
    setModifiedTabs((prev) => new Set(prev).add(activeTabId));

    // Update the tab content
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, content: value } : tab,
      ),
    );
  };

  const handleSaveFile = async () => {
    if (!activeTabId || !activeTab) return;

    setIsSaving(true);
    try {
      await fileService.saveFile(
        activeTab.path,
        activeTab.content,
      );

      // Remove the tab from modified tabs after successful save
      setModifiedTabs((prev) => {
        const newSet = new Set(prev);

        newSet.delete(activeTabId);

        return newSet;
      });

      // Show success feedback (you could add a toast notification here)
    } catch {
      // You could add error handling/notification here
    } finally {
      setIsSaving(false);
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Notify parent component when active file changes
  useEffect(() => {
    onActiveFileChange(activeTab?.path || null);
  }, [activeTab?.path, onActiveFileChange]);

  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        {/* Empty Tab Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center">
          <span className="text-sm text-gray-500">No files open</span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-600"
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
            <h3 className="mt-4 text-lg font-medium text-gray-400">
              No files open
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Select a file from the explorer to start editing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      {isSaving && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {/* Tab Bar */}
      {/* Tab Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center overflow-x-auto scrollbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer transition-colors ${
                tab.isActive
                  ? "bg-gray-900 text-gray-200"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
                className="w-4 h-4 text-blue-400 mr-2"
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
                className="ml-2 text-gray-500 hover:text-gray-300 transition-colors"
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

      {/* Code Editor */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            indentOnInput: false,
          }}
          editable={true}
          extensions={[python()]}
          theme={oneDark}
          value={activeTab?.content || ""}
          onChange={handleContentChange}
        />

        {/* Scrollbar Styling */}
        <style>{`
          .cm-scroller {
            font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace !important;
          }
          
          .scrollbar-tabs::-webkit-scrollbar {
            height: 8px;
          }
          .scrollbar-tabs::-webkit-scrollbar-track {
            background: #374151;
          }
          .scrollbar-tabs::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 4px;
          }
          .scrollbar-tabs::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>
      </div>
    </div>
  );
}
