import { useState, useEffect } from "react";
import { fileService } from "@/services/fileService";

interface CodeEditorProps {
  username: string;
  repoSlug: string;
  filePath: string | null;
}

export default function CodeEditor({ username, repoSlug, filePath }: CodeEditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!filePath) {
      setContent("");
      setFileName("");
      setError(null);
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fileService.getFileContent(username, repoSlug, filePath);
        setContent(response.content);
        setFileName(filePath.split("/").pop() || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
        setContent("");
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [username, repoSlug, filePath]);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-400">No file selected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Select a Python file from the explorer to start editing.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-400">Error loading file</h3>
          <p className="mt-2 text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden relative">
        {/* Line Numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 border-r border-gray-700 text-right select-none">
          <div className="py-4">
            {content.split('\n').map((_, index) => (
              <div key={index} className="px-2 py-0.5 text-xs text-gray-500 font-mono">
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Code Content */}
        <div className="ml-12 h-full overflow-auto">
          <div className="py-4 px-4">
            {content.split('\n').map((line, index) => (
              <div key={index} className="py-0.5 font-mono text-sm text-gray-200 leading-relaxed">
                <span className="whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollbar Styling */}
        <style jsx>{`
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
        `}</style>
      </div>
    </div>
  );
}
