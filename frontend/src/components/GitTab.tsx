import { useState, useEffect } from "react";
import { fileService } from "@/services/fileService";

interface GitTabProps {
  username: string;
  repoSlug: string;
  onFileSelect: (filePath: string) => void;
}

export default function GitTab({ username, repoSlug, onFileSelect }: GitTabProps) {
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string>("");

  const loadChangedFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fileService.getChangedFiles(username, repoSlug);
      setChangedFiles(response.changed_files);
      setLastCheck(response.last_check || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changed files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangedFiles();
  }, [username, repoSlug]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading changed files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading changed files</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Git Status</h3>
            <p className="text-xs text-gray-500 mt-1">
              {changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''} with changes
            </p>
            {lastCheck && (
              <p className="text-xs text-gray-400 mt-1">
                Last checked: {lastCheck}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadChangedFiles();
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh git status"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        
        {/* Git Status Legend */}
        {changedFiles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Status Legend:</span>
              <span className="ml-2">M=Modified, A=Added, D=Deleted, R=Renamed, C=Copied, U=Unmerged</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {changedFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Working directory clean</h3>
              <p className="mt-1 text-sm text-gray-500">
                No uncommitted changes detected
              </p>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {changedFiles.map((filePath, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-b-0"
                onClick={() => onFileSelect(filePath)}
              >
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2 flex-shrink-0"></div>
                  <span className="text-xs text-gray-600 group-hover:text-gray-800 truncate">
                    {filePath}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
