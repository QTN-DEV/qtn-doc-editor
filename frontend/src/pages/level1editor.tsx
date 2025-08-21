import { useState, useRef } from "react";
import { useParams } from "react-router-dom";

import FunctionNavigation from "@/components/FunctionNavigation";
import FullFunctionList from "@/components/FullFunctionList";
import GitTab from "@/components/GitTab";

export default function Level1EditorPage() {
  const { username, repoSlug } = useParams<{
    username: string;
    repoSlug: string;
  }>();
  const [activeTab, setActiveTab] = useState<"functions" | "git">("functions");
  const fullFunctionListRef = useRef<{ scrollToFunction: (key: string) => void }>(null);

  const handleFunctionSelect = (functionKey: string) => {
    if (fullFunctionListRef.current) {
      fullFunctionListRef.current.scrollToFunction(functionKey);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="h-screen relative">
        <div className="ml-[350px] flex">
          {/* Left Panel - Function Navigation with Tabs */}
          <aside className="fixed left-0 top-0 bottom-0 w-[350px] border-r border-gray-200 bg-white flex flex-col">
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
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "functions"
                    ? "bg-white text-gray-900 border-b-2 border-blue-500"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  onClick={() => setActiveTab("functions")}
                >
                  Functions
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "git"
                    ? "bg-white text-gray-900 border-b-2 border-blue-500"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  onClick={() => setActiveTab("git")}
                >
                  Git
                </button>
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-hidden">
              {/* Functions Tab */}
              <div
                className={`inset-0 transition-opacity duration-200 overflow-auto ${activeTab === "functions" ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
              >
                <FunctionNavigation
                  repoSlug={repoSlug!}
                  username={username!}
                  onFunctionSelect={handleFunctionSelect}
                />
              </div>

              {/* Git Tab */}
              {activeTab === "git" && (
                <div
                  className={`inset-0 transition-opacity duration-200 bg-white overflow-auto z-10`}
                >
                  <GitTab
                    repoSlug={repoSlug!}
                    username={username!}
                    onFileSelect={() => { }}
                  />
                </div>
              )}
            </div>
          </aside>

          {/* Right Panel - Full Function List (Scrollable) */}
          <main className="bg-white flex flex-col w-full">
            <FullFunctionList
              ref={fullFunctionListRef}
              repoSlug={repoSlug!}
              username={username!}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
