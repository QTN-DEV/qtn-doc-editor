import { useState, useEffect } from "react";
import { fileService } from "@/services/fileService";
import { FunctionInfo } from "@/types/functions";

interface FunctionNavigationProps {
  username: string;
  repoSlug: string;
  onFunctionSelect: (functionKey: string) => void;
}

// Helper to make function names human-readable
const toHumanReadable = (name: string): string => {
  return name
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

export default function FunctionNavigation({
  username,
  repoSlug,
  onFunctionSelect,
}: FunctionNavigationProps) {
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedFunctions, setGroupedFunctions] = useState<Record<string, FunctionInfo[]>>({});

  useEffect(() => {
    const fetchFullScan = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fileService.scanFullRepository(
          username,
          repoSlug,
        );

        setFunctions(response.functions);

        // Group functions by file path
        const grouped: Record<string, FunctionInfo[]> = {};
        response.functions.forEach((func) => {
          if (!grouped[func.file_path]) {
            grouped[func.file_path] = [];
          }
          grouped[func.file_path].push(func);
        });

        setGroupedFunctions(grouped);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load functions",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFullScan();
  }, [username, repoSlug]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      {Object.keys(groupedFunctions).length === 0 ? (
        <p className="text-gray-500 text-sm">No functions found</p>
      ) : (
        <div className="space-y-4 pb-4">
          {Object.entries(groupedFunctions).map(([filePath, fileFunctions]) => (
            <>
              {fileFunctions.map((func) => {
                const key = `${func.file_path}:${func.function_name}`;
                return (
                  <button
                    key={key}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors truncate flex items-center"
                    onClick={() => {
                      onFunctionSelect(key);
                    }}
                  >
                    {func.className ? (
                      <svg
                        className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H8m2-6v6m4-2v2m-4-2h4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 20l4-16m4 4l4 4-4 4M6 16L2 12l4-4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    )}
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-medium text-gray-700 text-sm truncate">
                        {filePath}
                      </h3>
                      <span className="truncate">
                        {func.className && (
                          <span className="text-gray-500">
                            {toHumanReadable(func.className)}.
                          </span>
                        )}
                        {toHumanReadable(func.function_name)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          ))}
        </div>
      )}
    </div>
  );
}