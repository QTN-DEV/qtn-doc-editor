import { useState, useEffect } from "react";

import ContextMenu from "./ContextMenu";
import CreateFileModal from "./CreateFileModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import RenameModal from "./RenameModal";

import { fileService } from "@/services/fileService";
import { FileItem } from "@/types/files";

interface DirectoryTreeProps {
  username: string;
  repoSlug: string;
  activeFile: string | null;
  onFileSelect: (filePath: string) => void;
  filter?: string[];
}

interface TreeNode extends FileItem {
  children?: TreeNode[];
  isExpanded?: boolean;
}

export default function DirectoryTree({
  username,
  repoSlug,
  activeFile,
  onFileSelect,
  filter,
}: DirectoryTreeProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    type: "file" | "directory" | "empty";
  } | null>(null);

  // Create file/folder modal state
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    currentPath: string;
    mode: "file" | "folder";
  }>({
    isOpen: false,
    currentPath: "",
    mode: "file",
  });

  // Delete confirm modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemName: string;
    itemPath: string;
    itemType: "file" | "directory";
  }>({
    isOpen: false,
    itemName: "",
    itemPath: "",
    itemType: "file",
  });

  // Rename modal state
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    itemName: string;
    itemPath: string;
    itemType: "file" | "directory";
  }>({
    isOpen: false,
    itemName: "",
    itemPath: "",
    itemType: "file",
  });

  const loadDirectory = async (path: string = "") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fileService.listDirectory(
        username,
        repoSlug,
        path,
        filter,
      );
      const items = response.items.map((item) => ({
        ...item,
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
    // Helper function to find and update a specific node
    const findAndUpdateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.path === targetPath && node.type === "directory") {
          // Replace the children with the new items
          const updatedChildren = newItems.map((item) => ({
            ...item,
          }));

          return {
            ...node,
            children: updatedChildren,
            isExpanded: true,
          };
        } else if (node.children) {
          // Recursively search in children
          return {
            ...node,
            children: findAndUpdateNode(node.children),
          };
        }

        return node;
      });
    };

    return findAndUpdateNode(currentData);
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

      try {
        // Always load folder contents to ensure they're up-to-date
        // This handles cases where the folder was previously expanded and collapsed
        await loadDirectory(item.path);
      } catch {
        // If loading fails, remove from expanded folders
        setExpandedFolders((prev) => {
          const newSet = new Set(prev);

          newSet.delete(item.path);

          return newSet;
        });
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

  const handleContextMenu = (event: React.MouseEvent, item?: TreeNode) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling

    if (item) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        path: item.path,
        type: item.type as "file" | "directory",
      });
    } else {
      // Right-click on empty space (root level)
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        path: "",
        type: "empty",
      });
    }
  };

  const handleCreateFile = async (filename: string) => {
    try {
      await fileService.createFile(username, repoSlug, filename);

      // Reload the current directory to show the new file
      const currentPath = createModal.currentPath;

      // If we're creating a file inside a folder, make sure the folder is expanded
      if (currentPath) {
        setExpandedFolders((prev) => new Set(prev).add(currentPath));
        await loadDirectory(currentPath);
      } else {
        // If creating in root, reload root
        await loadDirectory();
      }

      // Select the newly created file with the full path
      // If we're in a folder, the filename should include the folder path
      const fullFilePath = currentPath
        ? `${currentPath}/${filename}`
        : filename;

      onFileSelect(fullFilePath);
    } catch (err) {
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  const handleCreateFolder = async (dirname: string) => {
    try {
      await fileService.createDirectory(username, repoSlug, dirname);

      // Reload the current directory to show the new folder
      const currentPath = createModal.currentPath;

      // If we're creating a folder inside another folder, make sure the parent folder is expanded
      if (currentPath) {
        setExpandedFolders((prev) => new Set(prev).add(currentPath));
        await loadDirectory(currentPath);
      } else {
        // If creating in root, reload root
        await loadDirectory();
      }
    } catch (err) {
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  const handleContextMenuCreateFile = () => {
    if (contextMenu) {
      setCreateModal({
        isOpen: true,
        currentPath: contextMenu.path,
        mode: "file",
      });
    }
  };

  const handleContextMenuCreateFolder = () => {
    if (contextMenu) {
      setCreateModal({
        isOpen: true,
        currentPath: contextMenu.path,
        mode: "folder",
      });
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      // Find the item in the tree to get its name
      const findItem = (
        items: TreeNode[],
        targetPath: string,
      ): TreeNode | null => {
        for (const item of items) {
          if (item.path === targetPath) {
            return item;
          }
          if (item.children) {
            const found = findItem(item.children, targetPath);

            if (found) return found;
          }
        }

        return null;
      };

      const item = findItem(treeData, contextMenu.path);

      if (item) {
        setDeleteModal({
          isOpen: true,
          itemName: item.name,
          itemPath: item.path,
          itemType: item.type as "file" | "directory",
        });
      }
    }
  };

  const handleContextMenuRename = () => {
    if (contextMenu) {
      // Find the item in the tree to get its name
      const findItem = (
        items: TreeNode[],
        targetPath: string,
      ): TreeNode | null => {
        for (const item of items) {
          if (item.path === targetPath) {
            return item;
          }
          if (item.children) {
            const found = findItem(item.children, targetPath);

            if (found) return found;
          }
        }

        return null;
      };

      const item = findItem(treeData, contextMenu.path);

      if (item) {
        setRenameModal({
          isOpen: true,
          itemName: item.name,
          itemPath: item.path,
          itemType: item.type as "file" | "directory",
        });
      }
    }
  };

  const handleDeleteFile = async () => {
    try {
      await fileService.deleteFile(username, repoSlug, deleteModal.itemPath);

      // Reload the parent directory to reflect the deletion
      const parentPath = deleteModal.itemPath.split("/").slice(0, -1).join("/");

      if (parentPath) {
        await loadDirectory(parentPath);
      } else {
        await loadDirectory();
      }

      // Clear the active file if it was the deleted file
      if (activeFile === deleteModal.itemPath) {
        onFileSelect("");
      }
    } catch (err) {
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  const handleRenameFile = async (newName: string) => {
    try {
      const response = await fileService.renameFile(
        username,
        repoSlug,
        renameModal.itemPath,
        newName,
      );

      // Reload the parent directory to reflect the rename
      const parentPath = renameModal.itemPath.split("/").slice(0, -1).join("/");

      if (parentPath) {
        await loadDirectory(parentPath);
      } else {
        await loadDirectory();
      }

      // Update the active file if it was the renamed file
      if (activeFile === renameModal.itemPath) {
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        onFileSelect(newPath);
      }

      // Dispatch rename event for CodeEditor to update tabs
      window.dispatchEvent(
        new CustomEvent("file-renamed", {
          detail: {
            oldPath: renameModal.itemPath,
            newPath: response.new_path,
          },
        }),
      );
    } catch (err) {
      // Re-throw the error so the modal can handle it
      throw err;
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [username, repoSlug]);

  const renderTreeItem = (item: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isActive = activeFile === item.path;

    return (
      <div key={item.path} className="w-full">
        <button
          className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-1 relative ${
            item.type === "directory" ? "cursor-pointer" : "cursor-pointer"
          } ${isActive ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""} ${
            level > 0 ? "border-l-2 border-gray-100" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleItemClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
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
            {item.children.map((child) => renderTreeItem(child, level + 1))}
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
      <div
        className="flex-1 overflow-y-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
      >
        {treeData.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No files found
          </div>
        ) : (
          <div className="py-2">
            {treeData.map((item) => renderTreeItem(item, 0))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          showCreateFile={
            contextMenu.type === "directory" || contextMenu.type === "empty"
          }
          showCreateFolder={
            contextMenu.type === "directory" || contextMenu.type === "empty"
          }
          showDelete={
            contextMenu.type === "file" || contextMenu.type === "directory"
          }
          showRename={
            contextMenu.type === "file" || contextMenu.type === "directory"
          }
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCreateFile={handleContextMenuCreateFile}
          onCreateFolder={handleContextMenuCreateFolder}
          onDelete={handleContextMenuDelete}
          onRename={handleContextMenuRename}
        />
      )}

      {/* Create File/Folder Modal */}
      <CreateFileModal
        currentPath={createModal.currentPath}
        isOpen={createModal.isOpen}
        mode={createModal.mode}
        onClose={() =>
          setCreateModal({ isOpen: false, currentPath: "", mode: "file" })
        }
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        itemName={deleteModal.itemName}
        itemPath={deleteModal.itemPath}
        itemType={deleteModal.itemType}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            itemName: "",
            itemPath: "",
            itemType: "file",
          })
        }
        onConfirm={handleDeleteFile}
      />

      {/* Rename Modal */}
      <RenameModal
        currentName={renameModal.itemName}
        isOpen={renameModal.isOpen}
        itemType={renameModal.itemType}
        onClose={() =>
          setRenameModal({
            isOpen: false,
            itemName: "",
            itemPath: "",
            itemType: "file",
          })
        }
        onRename={handleRenameFile}
      />
    </div>
  );
}
