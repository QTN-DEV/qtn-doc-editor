import { useState, useEffect } from "react";

import { fileService } from "@/services/fileService";

interface GitTabProps {
  username: string;
  repoSlug: string;
  onFileSelect: (filePath: string) => void;
}

export default function GitTab({
  username,
  repoSlug,
  onFileSelect,
}: GitTabProps) {
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null); // Added missing state

  const loadChangedFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fileService.getChangedFiles(username, repoSlug);

      setChangedFiles(response.changed_files);
      setLastCheck(response.last_check || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load changed files",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || committing) {
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      await fileService.commitAndPush(username, repoSlug, commitMessage);
      alert("Changes committed and pushed successfully!");
      loadChangedFiles(); // Refresh status after commit
      setCommitMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to commit and push changes",
      );
    } finally {
      setCommitting(false);
    }
  };

  useEffect(() => {
    loadChangedFiles();
  }, [username, repoSlug]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Error loading changed files
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Commit Section - Always visible when there are changes */}
      {changedFiles.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-200 bg-gray-50">
          <div className="mb-3">
            <label
              className="block text-xs font-medium text-gray-700 mb-1"
              htmlFor="commit-message"
            >
              Commit Message
            </label>
            <textarea
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              id="commit-message"
              placeholder="Enter commit message..."
              rows={2}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""}{" "}
              to commit
            </span>
            <button
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!commitMessage.trim() || committing}
              onClick={handleCommit}
            >
              {committing ? "Committing..." : "Commit & Push"}
            </button>
          </div>
        </div>
      )}

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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Working directory clean
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No uncommitted changes detected
              </p>
              {lastCheck && (
                <p className="mt-1 text-xs text-gray-400">
                  Last checked: {lastCheck}
                </p>
              )}
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
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2 flex-shrink-0" />
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
