import { useState, useEffect } from "react";

import { fileService } from "@/services/fileService";

interface FunctionInfo {
  className: string | null;
  function_name: string;
  input_schema: { [key: string]: string }; // Changed to object for schema
  output_schema: string[]; // Changed to string for schema
  docs: string | null;
}

interface FunctionListProps {
  username: string;
  repoSlug: string;
  filePath: string;
}

// Helper to make function names human-readable
const toHumanReadable = (name: string): string => {
  return name
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

export default function FunctionList({
  username,
  repoSlug,
  filePath,
}: FunctionListProps) {
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedDocstrings, setEditedDocstrings] = useState<{
    [key: number]: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (!filePath) return;
    fetchFunctions();
  }, [username, repoSlug, filePath]);

  const handleDocstringChange = (index: number, value: string) => {
    setEditedDocstrings((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const fetchFunctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fileService.scanFunctions(
        username,
        repoSlug,
        filePath,
      );

      setFunctions(response.functions);
      // Initialize all functions as expanded
      const allExpanded = new Set<number>();
      response.functions.forEach((_, index) => {
        allExpanded.add(index);
      });
      setExpandedFunctions(allExpanded);

      // Initialize editedDocstrings with current docstrings
      const initialEditedDocs: { [key: number]: string } = {};

      response.functions.forEach((func, index) => {
        initialEditedDocs[index] = func.docs || "";
      });
      setEditedDocstrings(initialEditedDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load functions");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocstring = async (index: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await fileService.updateFunctionDocstring(
        username,
        repoSlug,
        filePath,
        functions[index].function_name,
        editedDocstrings[index],
      );

      // Refetch all data since the function implementation may have changed
      await fetchFunctions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save docstring");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFunctionExpansion = (index: number) => {
    setExpandedFunctions((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }

      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
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
    <div className="p-4 bg-gray-50 min-h-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Functions in <span className="text-blue-600">{filePath}</span>
      </h2>
      {functions.length === 0 ? (
        <p className="text-gray-600">No functions found in this file.</p>
      ) : (
        <ul className="space-y-4">
          {functions.map((func, index) => {
            const isExpanded = expandedFunctions.has(index);

            return (
              <li
                key={index}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleFunctionExpansion(index)}
                >
                  <div className="flex items-center">
                    {func.className ? (
                      <svg
                        className="h-6 w-6 text-purple-500 mr-3"
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
                        className="h-6 w-6 text-green-500 mr-3"
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      {func.className && (
                        <span className="text-gray-500 font-normal">
                          {toHumanReadable(func.className)}.
                        </span>
                      )}
                      {toHumanReadable(func.function_name)}
                    </h3>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-500 transform transition-transform ${isExpanded ? "rotate-90" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="ml-8 text-sm text-gray-700">
                      <div className="mb-3">
                        <strong className="text-gray-800">Input Schema:</strong>{" "}
                        {Object.keys(func.input_schema).length > 0 ? (
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {Object.entries(func.input_schema).map(
                              ([paramName, paramType]) => (
                                <li key={paramName}>
                                  {paramName}:{" "}
                                  <span className="font-mono text-blue-600">
                                    {paramType}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <span className="ml-2">None</span>
                        )}
                      </div>

                      {func.output_schema && (
                        <div className="mb-3">
                          <strong className="text-gray-800">
                            Output Schema:
                          </strong>{" "}
                          <span className="font-mono text-blue-600">
                            {func.output_schema}
                          </span>
                        </div>
                      )}

                      <div className="mt-3">
                        <label
                          className="block text-gray-800 font-medium mb-2"
                          htmlFor={`docstring-${index}`}
                        >
                          Docstring:
                        </label>
                        <textarea
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSaving}
                          id={`docstring-${index}`}
                          rows={5}
                          value={editedDocstrings[index]}
                          onChange={(e) =>
                            handleDocstringChange(index, e.target.value)
                          }
                        />
                        <div className="mt-2 space-x-2">
                          <button
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={isSaving}
                            onClick={() => handleSaveDocstring(index)}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
