import { useState } from "react";

import DirectoryTree from "@/components/DirectoryTree";
import TipTapEditor from "@/components/TipTapEditor";

export default function Level0EditorPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  const handleActiveFileChange = (filePath: string | null) => {
    setActiveFile(filePath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="h-screen">
        <div className="grid grid-cols-4 gap-0 h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Left Panel - Directory Tree with Tabs */}
          <aside className="col-span-1 border-r border-gray-200 bg-white">
            {/* Level 0 Editor Title */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <h2 className="text-sm font-semibold text-blue-900">
                Level 0 Editor
              </h2>
            </div>

            {/* Tab Content */}
            <div className="relative h-full">
              {/* Folders Tab */}
              <div className="absolute inset-0 transition-opacity duration-200 opacity-100 z-10">
                <DirectoryTree
                  activeFile={activeFile}
                  onFileSelect={handleFileSelect}
                />
              </div>
            </div>
          </aside>

          {/* Right Panel - TipTap Editor */}
          <main className="col-span-3 bg-white overflow-auto">
            <TipTapEditor
              filePath={selectedFile}
              onActiveFileChange={handleActiveFileChange}
              onFileSelect={handleFileSelect}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
