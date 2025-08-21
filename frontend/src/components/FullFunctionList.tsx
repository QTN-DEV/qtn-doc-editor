import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";

import { fileService } from "@/services/fileService";
import { FunctionInfo } from "@/types/functions";

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

const FullFunctionList = forwardRef<FullFunctionListRef, FullFunctionListProps>(({
  username,
  repoSlug,
}, ref) => {
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
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

        setFunctions(response.functions);

        // Initialize editedDocstrings with current docstrings
        const initialEditedDocs: { [key: string]: string } = {};
        response.functions.forEach((func) => {
          const key = `${func.file_path}:${func.function_name}`;
          initialEditedDocs[key] = func.docs || "";
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

  const handleSaveDocstring = async (func: FunctionInfo) => {
    setIsSaving(true);
    setError(null);
    try {
      const key = `${func.file_path}:${func.function_name}`;

      await fileService.updateFunctionDocstring(
        username,
        repoSlug,
        func.file_path,
        func.function_name,
        editedDocstrings[key],
      );

      // Update local state after successful save
      const updatedFunctions = functions.map((f) => {
        if (f.file_path === func.file_path && f.function_name === func.function_name) {
          return { ...f, docs: editedDocstrings[key] };
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
            const key = `${func.file_path}:${func.function_name}`;

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
                      {toHumanReadable(func.function_name)}
                    </h3>
                    <p className="text-sm text-gray-500">{func.file_path}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Input Schema</h4>
                    {Object.keys(func.input_schema).length > 0 ? (
                      <ul className="space-y-1 ml-4">
                        {Object.entries(func.input_schema).map(
                          ([paramName, paramDef]) => (
                            <li key={paramName} className="flex items-center text-sm gap-2">
                              <span className="text-gray-700">{paramName}<span className="text-red-500">{paramDef.required ? "*" : ""}</span></span>
                              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                {paramDef.type}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {paramDef.default ? `Default: ${paramDef.default}` : ""}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </div>

                  {func.output_schema && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Output Schema</h4>
                      <div className="flex flex gap-2 ml-4">
                        {func.output_schema.map((output) => (
                          <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                            {output}
                          </span>
                        ))}
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