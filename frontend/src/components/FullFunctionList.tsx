import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";

import { fileService } from "@/services/fileService";
import { FunctionDefinition, FileScanResponse } from "@/types/functions";

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

const FullFunctionList = forwardRef<FullFunctionListRef, FullFunctionListProps>(({
  username,
  repoSlug,
}, ref) => {

  const [functions, setFunctions] = useState<FunctionWithMeta[]>([]);
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
    const fetchFullScan = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fileService.scanFullRepository(
          username,
          repoSlug,
        );



        // Flatten all functions from all files
        const allFunctions: FunctionWithMeta[] = [];
        
        response.files.forEach((fileScan: FileScanResponse) => {
          // Add standalone functions
          fileScan.functions.forEach((func: FunctionDefinition) => {
            allFunctions.push({
              name: func.name,
              file_path: fileScan.file_path,
              className: null,
              docstring: func.docstring,
              parameters: func.parameters,
              return_type: func.return_type,
            });
          });
          
          // Add class methods
          fileScan.classes.forEach((cls) => {
            cls.functions.forEach((func: FunctionDefinition) => {
              allFunctions.push({
                name: func.name,
                file_path: fileScan.file_path,
                className: cls.name,
                docstring: func.docstring,
                parameters: func.parameters,
                return_type: func.return_type,
              });
            });
          });
        });

        setFunctions(allFunctions);

        // Initialize editedDocstrings with current docstrings
        const initialEditedDocs: { [key: string]: string } = {};
        allFunctions.forEach((func) => {
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

    fetchFullScan();
  }, [username, repoSlug]);

  const handleDocstringChange = (key: string, value: string) => {
    setEditedDocstrings((prev) => ({
      ...prev,
      [key]: value,
    }));
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

      // Update local state after successful save
      const updatedFunctions = functions.map((f) => {
        if (f.file_path === func.file_path && f.name === func.name) {
          return { ...f, docstring: editedDocstrings[key] };
        }
        return f;
      });

      setFunctions(updatedFunctions);
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
    <div className="w-full">
      {functions.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">No functions found in this repository.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {functions.map((func) => {
            const key = `${func.file_path}:${func.name}`;

            return (
              <div
                key={key}
                ref={(el) => (functionRefs.current[key] = el)}
                className="py-6 px-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center mb-4">
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {func.className && (
                        <span className="text-gray-500 font-normal">
                          {toHumanReadable(func.className)}.
                        </span>
                      )}
                      {toHumanReadable(func.name)}
                    </h3>
                    <p className="text-sm text-gray-500">{func.file_path}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Parameters</h4>
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
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Return Type</h4>
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
      )}
    </div>
  );
});

export default FullFunctionList;