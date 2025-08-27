import api from "./api";

import { DirectoryResponse, FileContentResponse } from "@/types/files";
import { FullScanResponse } from "@/types/functions";
import { API_URL } from "@/config";

export const fileService = {
  async listDirectory(path: string = ""): Promise<DirectoryResponse> {
    const params = new URLSearchParams();

    if (path) {
      params.append("path", path);
    }

    const response = await api.get(
      `${API_URL}/api/v1/repos/files?${params.toString()}`,
    );

    return response.data;
  },

  async getFileContent(path: string): Promise<FileContentResponse> {
    const params = new URLSearchParams({ path });

    const response = await api.get(
      `${API_URL}/api/v1/repos/files/content?${params.toString()}`,
    );

    return response.data;
  },

  async saveFile(
    path: string,
    content: string,
    encoding: string = "utf-8",
  ): Promise<{ message: string; encoding: string }> {
    const params = new URLSearchParams({ path });

    const response = await api.put(
      `${API_URL}/api/v1/repos/files/content?${params.toString()}`,
      { content, encoding },
    );

    return response.data;
  },

  async getChangedFiles(): Promise<{
    changed_files: string[];
    total_changed: number;
    last_check: string;
  }> {
    const response = await api.get(`${API_URL}/api/v1/repos/files/changed`);

    return response.data;
  },

  async createFile(
    filename: string,
    content: string = "",
    encoding: string = "utf-8",
  ): Promise<{ path: string; message: string; encoding: string }> {
    const response = await api.post(`${API_URL}/api/v1/repos/files/create`, {
      filename,
      content,
      encoding,
    });

    return response.data;
  },

  async createDirectory(
    dirname: string,
  ): Promise<{ path: string; message: string }> {
    const response = await api.post(`${API_URL}/api/v1/repos/files/create-directory`, {
      dirname,
    });

    return response.data;
  },

  async deleteFile(path: string): Promise<{ path: string; message: string }> {
    const response = await api.delete(`${API_URL}/api/v1/repos/files/delete`, {
      data: { path },
    });

    return response.data;
  },

  async renameFile(
    oldPath: string,
    newName: string,
  ): Promise<{ old_path: string; new_path: string; message: string }> {
    const response = await api.put(`${API_URL}/api/v1/repos/files/rename`, {
      old_path: oldPath,
      new_name: newName,
    });

    return response.data;
  },

  async scanFunctions(
    path: string,
  ): Promise<{ path: string; functions: any[] }> {
    const params = new URLSearchParams({ path });
    const response = await api.get(
      `${API_URL}/api/v1/repos/scan/functions?${params.toString()}`,
    );

    return response.data;
  },

  async scanFullRepository(): Promise<FullScanResponse> {
    const response = await api.get(`${API_URL}/api/v1/repos/scan/full`);

    return response.data;
  },

  async updateFunctionDocstring(
    filePath: string,
    functionName: string,
    newDocstring: string,
  ): Promise<{ message: string; status: string }> {
    const response = await api.put(
      `${API_URL}/api/v1/repos/scan/functions/docstring`,
      {
        file_path: filePath,
        function_name: functionName,
        new_docstring: newDocstring,
      },
    );

    return response.data;
  },
};
