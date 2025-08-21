import { useState, useEffect, useRef } from "react";

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (filename: string) => Promise<void>;
  onCreateFolder?: (dirname: string) => Promise<void>;
  currentPath?: string;
  mode?: "file" | "folder";
}

export default function CreateFileModal({
  isOpen,
  onClose,
  onCreateFile,
  onCreateFolder,
  currentPath = "",
  mode = "file",
}: CreateFileModalProps) {
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilename("");
      setError("");
      setIsSubmitting(false);
      // Focus the input after a short delay to ensure the modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filename.trim()) {
      setError(
        mode === "file" ? "Filename is required" : "Folder name is required",
      );

      return;
    }

    // Basic filename validation
    const invalidChars = /[<>:"/\\|?*]/;

    if (invalidChars.test(filename)) {
      setError("Name contains invalid characters");

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "folder") {
        // Create folder
        if (!onCreateFolder) {
          throw new Error("Folder creation not supported");
        }
        const fullPath = currentPath ? `${currentPath}/${filename}` : filename;

        await onCreateFolder(fullPath);
      } else {
        // Create file
        const fullPath = currentPath ? `${currentPath}/${filename}` : filename;

        await onCreateFile(fullPath);
      }
      onClose();
    } catch (err) {
      // Handle different types of errors
      if (err instanceof Error) {
        if (
          err.message.includes("409") ||
          err.message.includes("already exists")
        ) {
          setError(
            mode === "file"
              ? "A file with this name already exists"
              : "A folder with this name already exists",
          );
        } else if (err.message.includes("404")) {
          setError("Repository not found");
        } else if (err.message.includes("400")) {
          setError("Invalid name");
        } else {
          setError(`Failed to create ${mode}: ${err.message}`);
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Create New {mode === "file" ? "File" : "Folder"}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <svg
              className="w-6 h-6"
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
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="filename"
            >
              {mode === "file" ? "Filename" : "Folder Name"}
            </label>
            <input
              ref={inputRef}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? "border-red-500" : "border-gray-300"
              } ${isSubmitting ? "bg-gray-50 cursor-not-allowed" : ""}`}
              disabled={isSubmitting}
              id="filename"
              placeholder={
                mode === "file"
                  ? "Enter filename (e.g., index.js, style.css)"
                  : "Enter folder name"
              }
              type="text"
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {currentPath && (
              <p className="mt-1 text-xs text-gray-500">
                Will be created in:{" "}
                <span className="font-mono text-blue-600">{currentPath}/</span>
              </p>
            )}
            {!currentPath && (
              <p className="mt-1 text-xs text-gray-500">
                Will be created in:{" "}
                <span className="font-mono text-blue-600">repository root</span>
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
              )}
              <span>
                {isSubmitting
                  ? "Creating..."
                  : `Create ${mode === "file" ? "File" : "Folder"}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
