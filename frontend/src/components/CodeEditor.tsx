import { useState, useEffect } from "react";

import { fileService } from "@/services/fileService";
import { Tab } from "@/types/files";

interface CodeEditorProps {
  username: string;
  repoSlug: string;
  filePath: string | null;
  onFileSelect: (filePath: string) => void;
}

export default function CodeEditor({
  username,
  repoSlug,
  filePath,
}: CodeEditorProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Add new file to tabs when filePath changes
  useEffect(() => {
    if (!filePath) return;

    const addTab = async () => {
      try {
        const response = await fileService.getFileContent(
          username,
          repoSlug,
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
  }, [username, repoSlug, filePath]);

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

    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

      if (updatedTabs.length === 0) {
        setActiveTabId(null);

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
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

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
    <div className="h-full flex flex-col bg-gray-900">
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
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden relative">
        {/* Line Numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 border-r border-gray-700 text-right select-none">
          <div className="py-4">
            {activeTab?.content.split("\n").map((_, index) => (
              <div
                key={index}
                className="px-2 py-0.5 text-xs text-gray-500 font-mono"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Code Content */}
        <div className="ml-12 h-full overflow-auto">
          <div className="py-4 px-4">
            {activeTab?.content.split("\n").map((line, index) => (
              <div
                key={index}
                className="py-0.5 font-mono text-sm text-gray-200 leading-relaxed"
              >
                <span className="whitespace-pre">{line || " "}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollbar Styling */}
        <style>{`
          .overflow-auto::-webkit-scrollbar {
            width: 8px;
          }
          .overflow-auto::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .overflow-auto::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 4px;
          }
          .overflow-auto::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
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
