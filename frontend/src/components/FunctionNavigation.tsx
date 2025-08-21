import { useState, useEffect } from "react";
import { fileService } from "@/services/fileService";
import { FunctionDefinition, FileScanResponse } from "@/types/functions";
import { toDotNotation } from "@/lib/utils";

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

interface FunctionWithMeta {
  name: string;
  file_path: string;
  className: string | null;
  docstring: string | null;
}

interface ClassGroup {
  className: string;
  functions: FunctionWithMeta[];
}

interface FileGroup {
  filePath: string;
  classes: ClassGroup[];
}

export default function FunctionNavigation({
  username,
  repoSlug,
  onFunctionSelect,
}: FunctionNavigationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<FileGroup[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFullScan = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fileService.scanFullRepository(
          username,
          repoSlug,
        );



        // Build tree structure: Files > Classes > Functions
        const tree: FileGroup[] = [];
        
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
            };
            
            if (!functionsByClass["NoClass"]) {
              functionsByClass["NoClass"] = [];
            }
            functionsByClass["NoClass"].push(functionWithMeta);
          });
          
          // Add class methods
          fileScan.classes.forEach((cls) => {
            cls.functions.forEach((func: FunctionDefinition) => {
              const functionWithMeta: FunctionWithMeta = {
                name: func.name,
                file_path: fileScan.file_path,
                className: cls.name,
                docstring: func.docstring,
              };
              
              if (!functionsByClass[cls.name]) {
                functionsByClass[cls.name] = [];
              }
              functionsByClass[cls.name].push(functionWithMeta);
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
            tree.push({
              filePath: fileScan.file_path,
              classes: classGroups,
            });
          }
        });

        setTreeData(tree);
        
        // Auto-expand all files and classes initially for better UX
        const allFiles = new Set(tree.map(file => file.filePath));
        setExpandedFiles(allFiles);
        
        // Auto-expand all classes too
        const allClasses = new Set<string>();
        tree.forEach(file => {
          file.classes.forEach(cls => {
            allClasses.add(`${file.filePath}:${cls.className}`);
          });
        });
        setExpandedClasses(allClasses);
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

  const toggleFileExpansion = (filePath: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const toggleClassExpansion = (filePath: string, className: string) => {
    const key = `${filePath}:${className}`;
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

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
      {treeData.length === 0 ? (
        <p className="text-gray-500 text-sm">No functions found</p>
      ) : (
        <div className="space-y-1 pb-4">
          {treeData.map((fileGroup) => (
            <div key={fileGroup.filePath} className="select-none">
              {/* Level 1: File Name */}
              <button
                className="w-full text-left px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center"
                onClick={() => toggleFileExpansion(fileGroup.filePath)}
              >
                <svg
                  className={`h-4 w-4 mr-2 flex-shrink-0 transition-transform ${
                    expandedFiles.has(fileGroup.filePath) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <svg
                  className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0"
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
                <span className="truncate">{toDotNotation(fileGroup.filePath)}</span>
              </button>

              {/* Level 2 & 3: Classes and Functions */}
              {expandedFiles.has(fileGroup.filePath) && (
                <div className="ml-6 space-y-1">
                  {fileGroup.classes.map((classGroup) => {
                    const classKey = `${fileGroup.filePath}:${classGroup.className}`;
                    const isClassExpanded = expandedClasses.has(classKey);
                    
                    return (
                      <div key={classGroup.className}>
                        {/* Level 2: Class Name */}
                        <button
                          className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors flex items-center"
                          onClick={() => toggleClassExpansion(fileGroup.filePath, classGroup.className)}
                        >
                          <svg
                            className={`h-3 w-3 mr-2 flex-shrink-0 transition-transform ${
                              isClassExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          {classGroup.className === "NoClass" ? (
                            <svg
                              className="h-3 w-3 text-green-500 mr-2 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 20l4-16m4 4l4 4-4 4M6 16L2 12l4-4"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-3 w-3 text-purple-500 mr-2 flex-shrink-0"
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
                          )}
                          <span className="truncate font-medium">
                            {classGroup.className === "NoClass" ? "Functions" : toHumanReadable(classGroup.className)}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            ({classGroup.functions.length})
                          </span>
                        </button>

                        {/* Level 3: Functions */}
                        {isClassExpanded && (
                          <div className="ml-5 space-y-0.5">
                            {classGroup.functions.map((func) => {
                              const functionKey = `${func.file_path}:${func.name}`;
                              return (
                                <button
                                  key={functionKey}
                                  className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center"
                                  onClick={() => onFunctionSelect(functionKey)}
                                >
                                  <svg
                                    className="h-3 w-3 text-blue-500 mr-2 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 20l4-16m4 4l4 4-4 4M6 16L2 12l4-4"
                                    />
                                  </svg>
                                  <span className="truncate">{toHumanReadable(func.name)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}