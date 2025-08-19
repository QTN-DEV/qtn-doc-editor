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
};
