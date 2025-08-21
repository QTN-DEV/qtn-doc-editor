import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";

import { fileService } from "@/services/fileService";
import { FunctionDefinition, FileScanResponse } from "@/types/functions";
import { toDotNotation } from "@/lib/utils";

interface FullFunctionListProps {
  username: string;
  repoSlug: string;
}

// Helper to make function names human-readable
const toHumanReadable = (name: string): string => {
  return name
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

export interface FullFunctionListRef {
  scrollToFunction: (key: string) => void;
}

interface FunctionWithMeta {
  name: string;
  file_path: string;
  className: string | null;
  docstring: string | null;
  parameters: any[]; // Keep parameters for display
  return_type: string | null;
}

interface ClassGroup {
  className: string;
  functions: FunctionWithMeta[];
}

interface FileGroup {
  filePath: string;
  classes: ClassGroup[];
}

const FullFunctionList = forwardRef<FullFunctionListRef, FullFunctionListProps>(({
  username,
  repoSlug,
}, ref) => {

  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedDocstrings, setEditedDocstrings] = useState<{
    [key: string]: string; // key is file_path:function_name
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const functionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    scrollToFunction: (key: string) => {
      const element = functionRefs.current[key];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add a temporary highlight effect
        element.classList.add("bg-yellow-100");
        setTimeout(() => {
          element.classList.remove("bg-yellow-100");
        }, 2000);
      }
    }
  }));

  useEffect(() => {
    fetchFullScan();
  }, [username, repoSlug]);



  const handleDocstringChange = (key: string, value: string) => {
    setEditedDocstrings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fetchFullScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fileService.scanFullRepository(
        username,
        repoSlug,
      );

      // Group functions by file and class
      const fileGroups: FileGroup[] = [];
      const allFunctionsForDocstrings: FunctionWithMeta[] = [];

      response.files.forEach((fileScan: FileScanResponse) => {
        const classGroups: ClassGroup[] = [];

        // Group functions by class
        const functionsByClass: Record<string, FunctionWithMeta[]> = {};

        // Add standalone functions to "NoClass"
        fileScan.functions.forEach((func: FunctionDefinition) => {
          const functionWithMeta: FunctionWithMeta = {
            name: func.name,
            file_path: fileScan.file_path,
            className: null,
            docstring: func.docstring,
            parameters: func.parameters,
            return_type: func.return_type,
          };

          if (!functionsByClass["NoClass"]) {
            functionsByClass["NoClass"] = [];
          }
          functionsByClass["NoClass"].push(functionWithMeta);
          allFunctionsForDocstrings.push(functionWithMeta);
        });

        // Add class methods
        fileScan.classes.forEach((cls) => {
          cls.functions.forEach((func: FunctionDefinition) => {
            const functionWithMeta: FunctionWithMeta = {
              name: func.name,
              file_path: fileScan.file_path,
              className: cls.name,
              docstring: func.docstring,
              parameters: func.parameters,
              return_type: func.return_type,
            };

            if (!functionsByClass[cls.name]) {
              functionsByClass[cls.name] = [];
            }
            functionsByClass[cls.name].push(functionWithMeta);
            allFunctionsForDocstrings.push(functionWithMeta);
          });
        });

        // Convert to ClassGroup array
        Object.entries(functionsByClass).forEach(([className, functions]) => {
          classGroups.push({
            className,
            functions,
          });
        });

        // Only add files that have functions
        if (classGroups.length > 0) {
          fileGroups.push({
            filePath: fileScan.file_path,
            classes: classGroups,
          });
        }
      });

      setFileGroups(fileGroups);

      // Initialize editedDocstrings with current docstrings
      const initialEditedDocs: { [key: string]: string } = {};
      allFunctionsForDocstrings.forEach((func) => {
        const key = `${func.file_path}:${func.name}`;
        initialEditedDocs[key] = func.docstring || "";
      });
      setEditedDocstrings(initialEditedDocs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load functions",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocstring = async (func: FunctionWithMeta) => {
    setIsSaving(true);
    setError(null);
    try {
      const key = `${func.file_path}:${func.name}`;

      await fileService.updateFunctionDocstring(
        username,
        repoSlug,
        func.file_path,
        func.name,
        editedDocstrings[key],
      );

      // Refetch all data since the function implementation may have changed
      await fetchFullScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save docstring");
    } finally {
      setIsSaving(false);
    }
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
    <div
      className="w-full h-full"
    >
      {fileGroups.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">No functions found in this repository.</p>
        </div>
      ) : (
        <div>
          {fileGroups.map((fileGroup) => (
            <div key={fileGroup.filePath} className="mb-8">
              {/* File Header */}
              <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 px-6 h-11.5 flex items-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-blue-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h2 className="text-lg font-semibold text-blue-800">
                    {toDotNotation(fileGroup.filePath)}
                  </h2>
                </div>
              </div>

              {/* Class Groups */}
              {fileGroup.classes.map((classGroup) => (
                <div key={`${fileGroup.filePath}:${classGroup.className}`}>
                  {/* Class Header (if not NoClass) */}
                  {classGroup.className !== "NoClass" && (
                    <div className="sticky top-0 z-11 bg-purple-50 border-b border-purple-200 px-6 h-11.5 flex items-center">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-purple-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M9 7v4m6-4v4m-6 4h6"
                          />
                        </svg>
                        <h3 className="text-base font-medium text-purple-800">
                          <div className="flex items-center gap-2">
                            {toDotNotation(fileGroup.filePath)} / {toHumanReadable(classGroup.className)}
                          </div>
                        </h3>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {classGroup.functions.length} functions
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Functions */}
                  <div className="divide-y divide-gray-200">
                    {classGroup.functions.map((func) => {
                      const key = `${func.file_path}:${func.name}`;

                      return (
                        <div
                          key={key}
                          ref={(el) => (functionRefs.current[key] = el)}
                          className="py-6 px-6 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center mb-4">
                            <div className="flex-1">
                              <h4 className="text-xl font-semibold text-gray-900">
                                {toHumanReadable(func.name)}
                              </h4>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-semibold text-gray-800 mb-2">Parameters</h5>
                              {func.parameters.length > 0 ? (
                                <ul className="space-y-1 ml-4">
                                  {func.parameters.map(
                                    (param) => (
                                      <li key={param.name} className="flex items-center text-sm gap-2">
                                        <span className="text-gray-700">{param.name}<span className="text-red-500">{param.required ? "*" : ""}</span></span>
                                        <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                          {param.type}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          {param.default ? `Default: ${param.default}` : ""}
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              ) : (
                                <span className="text-sm text-gray-500">None</span>
                              )}
                            </div>

                            {func.return_type && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-800 mb-2">Return Type</h5>
                                <div className="flex flex gap-2 ml-4">
                                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                    {func.return_type}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div>
                              <label
                                className="block text-sm font-semibold text-gray-800 mb-2"
                                htmlFor={`docstring-${key}`}
                              >
                                Docstring:
                              </label>
                              <textarea
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                                disabled={isSaving}
                                id={`docstring-${key}`}
                                placeholder="Add a description for this function..."
                                rows={4}
                                value={editedDocstrings[key]}
                                onChange={(e) =>
                                  handleDocstringChange(key, e.target.value)
                                }
                              />
                              <div className="mt-3">
                                <button
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                  disabled={isSaving}
                                  onClick={() => handleSaveDocstring(func)}
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default FullFunctionList;