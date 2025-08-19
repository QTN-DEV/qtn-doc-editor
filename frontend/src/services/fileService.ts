import { DirectoryResponse, FileContentResponse } from "@/types/files";

const API_BASE = "http://localhost:8000/api/v1";

export const fileService = {
  async listDirectory(
    username: string,
    repoSlug: string,
    path: string = "",
  ): Promise<DirectoryResponse> {
    const params = new URLSearchParams();

    if (path) {
      params.append("path", path);
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
  ): Promise<{ changed_files: string[]; total_changed: number; last_check: string }> {
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
};
