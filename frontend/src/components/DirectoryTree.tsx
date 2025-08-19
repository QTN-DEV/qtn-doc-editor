import { useState, useEffect } from "react";

import { FileItem } from "@/types/files";
import { fileService } from "@/services/fileService";

interface DirectoryTreeProps {
  username: string;
  repoSlug: string;
  activeFile: string | null;
  onFileSelect: (filePath: string) => void;
}

interface TreeNode extends FileItem {
  children?: TreeNode[];
  isExpanded?: boolean;
  level: number;
}

export default function DirectoryTree({
  username,
  repoSlug,
  activeFile,
  onFileSelect,
}: DirectoryTreeProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  const loadDirectory = async (path: string = "") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fileService.listDirectory(
        username,
        repoSlug,
        path,
      );
      const items = response.items.map((item) => ({
        ...item,
        level: path ? path.split("/").length : 0,
        isExpanded: false,
      }));

      if (path) {
        // Update existing tree structure
        setTreeData((prevData) => updateTreeData(prevData, path, items));
      } else {
        // Root level
        setTreeData(items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  const updateTreeData = (
    currentData: TreeNode[],
    targetPath: string,
    newItems: TreeNode[],
  ): TreeNode[] => {
    const pathParts = targetPath.split("/");

    const updateNode = (nodes: TreeNode[], level: number): TreeNode[] => {
      return nodes.map((node) => {
        if (node.path === targetPath && node.type === "directory") {
          return {
            ...node,
            children: newItems,
            isExpanded: true,
          };
        } else if (node.children && level < pathParts.length) {
          return {
            ...node,
            children: updateNode(node.children, level + 1),
          };
        }

        return node;
      });
    };

    return updateNode(currentData, 0);
  };

  const toggleFolder = async (item: TreeNode) => {
    if (item.type !== "directory") return;

    if (expandedFolders.has(item.path)) {
      // Collapse folder
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);

        newSet.delete(item.path);

        return newSet;
      });

      // Update tree data to collapse
      setTreeData((prevData) => collapseFolder(prevData, item.path));
    } else {
      // Expand folder
      setExpandedFolders((prev) => new Set(prev).add(item.path));

      // Always try to load folder contents if not already loaded
      if (!item.children) {
        await loadDirectory(item.path);
      }
    }
  };

  const collapseFolder = (
    nodes: TreeNode[],
    targetPath: string,
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, isExpanded: false };
      } else if (node.children) {
        return { ...node, children: collapseFolder(node.children, targetPath) };
      }

      return node;
    });
  };

  const handleItemClick = (item: TreeNode) => {
    if (item.type === "directory") {
      toggleFolder(item);
    } else {
      onFileSelect(item.path);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [username, repoSlug]);

  const renderTreeItem = (item: TreeNode) => {
    const isExpanded = expandedFolders.has(item.path);
    const isActive = activeFile === item.path;

    return (
      <div key={item.path} className="w-full">
        <button
          className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-1 ${
            item.type === "directory" ? "cursor-pointer" : "cursor-pointer"
          } ${isActive ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}`}
          style={{ paddingLeft: `${item.level * 16 + 12}px` }}
          onClick={() => handleItemClick(item)}
        >
          {/* Expand/Collapse arrow for directories */}
          {item.type === "directory" && (
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
          )}

          {/* Placeholder for non-directory items to align icons */}
          {item.type !== "directory" && (
            <div className="flex-shrink-0 w-4 h-4" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0 w-4 h-4">
            {item.type === "directory" ? (
              <svg
                className="w-4 h-4 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            ) : item.extension ? (
              <svg
                className="w-4 h-4 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  fillRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  fillRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{item.name}</p>
          </div>
        </button>

        {/* Render children if expanded */}
        {isExpanded && item.children && (
          <div className="w-full">
            {item.children.map((child) => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  if (loading && treeData.length === 0) {
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
        <button
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          onClick={() => loadDirectory()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto">
        {treeData.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No files found
          </div>
        ) : (
          <div className="py-2">
            {treeData.map((item) => renderTreeItem(item))}
          </div>
        )}
      </div>
    </div>
  );
}
