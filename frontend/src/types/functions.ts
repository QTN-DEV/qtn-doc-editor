export interface FunctionInfo {
  file_path: string;
  className: string | null;
  function_name: string;
  input_schema: { [key: string]: string };
  output_schema: string;
  docs: string | null;
}

export interface FullScanResponse {
  functions: FunctionInfo[];
}