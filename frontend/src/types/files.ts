export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
}

export interface DirectoryResponse {
  path: string;
  items: FileItem[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  encoding: string;
}
