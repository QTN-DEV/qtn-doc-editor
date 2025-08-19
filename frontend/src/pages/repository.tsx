import { useState } from "react";
import { useParams } from "react-router-dom";

import DirectoryTree from "@/components/DirectoryTree";
import CodeEditor from "@/components/CodeEditor";

export default function RepositoryPage() {
  const { username, repoSlug } = useParams();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="h-screen">
        <div className="grid grid-cols-4 gap-0 h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Left Panel - Directory Tree */}
          <aside className="col-span-1 border-r border-gray-200 bg-white">
            <DirectoryTree
              repoSlug={repoSlug!}
              username={username!}
              onFileSelect={handleFileSelect}
            />
          </aside>

          {/* Right Panel - Code Editor */}
          <main className="col-span-3 bg-white">
            <CodeEditor
              filePath={selectedFile}
              repoSlug={repoSlug!}
              username={username!}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
