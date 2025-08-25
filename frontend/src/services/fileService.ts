import { DirectoryResponse, FileContentResponse } from "@/types/files";
import { FullScanResponse } from "@/types/functions";
const API_URL = import.meta.env.VITE_API_URL;
const API_BASE = `${API_URL}/api/v1`;

export const fileService = {
  async listDirectory(
    path: string = "",
  ): Promise<DirectoryResponse> {
    const params = new URLSearchParams();

    if (path) {
      params.append("path", path);
    }

    const response = await fetch(
      `${API_BASE}/repos/files?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`);
    }

    return response.json();
  },

  async getFileContent(
    path: string,
  ): Promise<FileContentResponse> {
    const params = new URLSearchParams({ path });

    const response = await fetch(
      `${API_BASE}/repos/files/content?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.statusText}`);
    }

    return response.json();
  },

  async saveFile(
    path: string,
    content: string,
    encoding: string = "utf-8",
  ): Promise<{ message: string; encoding: string }> {
    const params = new URLSearchParams({ path });

    const response = await fetch(
      `${API_BASE}/repos/files/content?${params.toString()}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, encoding }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to save file: ${response.statusText}`);
    }

    return response.json();
  },

  async getChangedFiles(): Promise<{
    changed_files: string[];
    total_changed: number;
    last_check: string;
  }> {
    const response = await fetch(
      `${API_BASE}/repos/files/changed`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get changed files: ${response.statusText}`);
    }

    return response.json();
  },

  async createFile(
    filename: string,
    content: string = "",
    encoding: string = "utf-8",
  ): Promise<{ path: string; message: string; encoding: string }> {
    const response = await fetch(
      `${API_BASE}/repos/files/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, content, encoding }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }

    return response.json();
  },

  async createDirectory(
    dirname: string,
  ): Promise<{ path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/files/create-directory`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dirname }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create directory: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteFile(
    path: string,
  ): Promise<{ path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/files/delete`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }

    return response.json();
  },

  async renameFile(
    oldPath: string,
    newName: string,
  ): Promise<{ old_path: string; new_path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/files/rename`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ old_path: oldPath, new_name: newName }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to rename file: ${response.statusText}`);
    }

    return response.json();
  },

  async scanFunctions(
    path: string,
  ): Promise<{ path: string; functions: any[] }> {
    const params = new URLSearchParams({ path });
    const response = await fetch(
      `${API_BASE}/repos/scan/functions?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to scan functions: ${response.statusText}`);
    }

    return response.json();
  },

  async scanFullRepository(
  ): Promise<FullScanResponse> {
    const response = await fetch(
      `${API_BASE}/repos/scan/full`,
    );

    if (!response.ok) {
      throw new Error(`Failed to scan repository: ${response.statusText}`);
    }

    return response.json();
  },

  async updateFunctionDocstring(
    filePath: string,
    functionName: string,
    newDocstring: string,
  ): Promise<{ message: string; status: string }> {
    const response = await fetch(
      `${API_BASE}/repos/scan/functions/docstring`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: filePath,
          function_name: functionName,
          new_docstring: newDocstring,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update docstring: ${response.statusText}`);
    }

    return response.json();
  },
};
