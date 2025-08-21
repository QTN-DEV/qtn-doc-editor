import { useState } from "react";
import { useParams } from "react-router-dom";

import DirectoryTree from "@/components/DirectoryTree";
import FunctionList from "@/components/FunctionList";
import GitTab from "@/components/GitTab";

export default function Level1EditorPage() {
  const { username, repoSlug } = useParams<{
    username: string;
    repoSlug: string;
  }>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"folders" | "git">("folders");

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="h-screen">
        <div className="grid grid-cols-4 gap-0 h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Left Panel - Directory Tree with Tabs */}
          <aside className="col-span-1 border-r border-gray-200 bg-white">
            {/* Level 1 Editor Title */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <h2 className="text-sm font-semibold text-blue-900">
                Level 1 Editor
              </h2>
            </div>

            {/* Tab Navigation */}
            <div className="bg-gray-100 border-b border-gray-200">
              <div className="flex">
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "folders"
                      ? "bg-white text-gray-900 border-b-2 border-blue-500"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab("folders")}
                >
                  Folders
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "git"
                      ? "bg-white text-gray-900 border-b-2 border-blue-500"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab("git")}
                >
                  Git
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="relative h-full">
              {/* Folders Tab */}
              <div
                className={`absolute inset-0 transition-opacity duration-200 ${
                  activeTab === "folders" ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <DirectoryTree
                  activeFile={selectedFile}
                  filter={["*.py"]}
                  repoSlug={repoSlug!}
                  username={username!}
                  onFileSelect={handleFileSelect}
                />
              </div>

              {/* Git Tab */}
              <div
                className={`absolute inset-0 transition-opacity duration-200 bg-white ${
                  activeTab === "git" ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <GitTab
                  repoSlug={repoSlug!}
                  username={username!}
                  onFileSelect={handleFileSelect}
                />
              </div>
            </div>
          </aside>

          {/* Right Panel - Function List */}
          <main className="col-span-3 bg-white overflow-auto">
            {selectedFile ? (
              <FunctionList
                filePath={selectedFile}
                repoSlug={repoSlug!}
                username={username!}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  Select a file to view its functions
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
