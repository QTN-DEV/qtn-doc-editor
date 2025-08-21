import { DirectoryResponse, FileContentResponse } from "@/types/files";

const API_BASE = "http://localhost:8000/api/v1";

export const fileService = {
  async listDirectory(
    username: string,
    repoSlug: string,
    path: string = "",
    filter?: string[],
  ): Promise<DirectoryResponse> {
    const params = new URLSearchParams();

    if (path) {
      params.append("path", path);
    }

    if (filter) {
      params.append("filter", filter.join(","));
    }

    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`);
    }

    return response.json();
  },

  async getFileContent(
    username: string,
    repoSlug: string,
    path: string,
  ): Promise<FileContentResponse> {
    const params = new URLSearchParams({ path });

    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/content?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.statusText}`);
    }

    return response.json();
  },

  async saveFile(
    username: string,
    repoSlug: string,
    path: string,
    content: string,
    encoding: string = "utf-8",
  ): Promise<{ message: string; encoding: string }> {
    const params = new URLSearchParams({ path });

    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/content?${params.toString()}`,
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

  async getChangedFiles(
    username: string,
    repoSlug: string,
  ): Promise<{
    changed_files: string[];
    total_changed: number;
    last_check: string;
  }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/changed`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get changed files: ${response.statusText}`);
    }

    return response.json();
  },

  async commitAndPush(
    username: string,
    repoSlug: string,
    commitMessage: string,
  ): Promise<{ message: string; commit_hash: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/git/commit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: commitMessage }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to commit and push: ${response.statusText}`);
    }

    return response.json();
  },

  async createFile(
    username: string,
    repoSlug: string,
    filename: string,
    content: string = "",
    encoding: string = "utf-8",
  ): Promise<{ path: string; message: string; encoding: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/create`,
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
    username: string,
    repoSlug: string,
    dirname: string,
  ): Promise<{ path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/create-directory`,
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
    username: string,
    repoSlug: string,
    path: string,
  ): Promise<{ path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/delete`,
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
    username: string,
    repoSlug: string,
    oldPath: string,
    newName: string,
  ): Promise<{ old_path: string; new_path: string; message: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/files/rename`,
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
    username: string,
    repoSlug: string,
    path: string,
  ): Promise<{ path: string; functions: any[] }> {
    const params = new URLSearchParams({ path });
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/scan/functions?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to scan functions: ${response.statusText}`);
    }

    return response.json();
  },

  async scanFullRepository(
    username: string,
    repoSlug: string,
  ): Promise<{ functions: any[] }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/scan/full`,
    );

    if (!response.ok) {
      throw new Error(`Failed to scan repository: ${response.statusText}`);
    }

    return response.json();
  },

  async updateFunctionDocstring(
    username: string,
    repoSlug: string,
    filePath: string,
    functionName: string,
    newDocstring: string,
  ): Promise<{ message: string; status: string }> {
    const response = await fetch(
      `${API_BASE}/repos/${username}/${repoSlug}/scan/functions/docstring`,
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
