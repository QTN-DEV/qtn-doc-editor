export interface FunctionInfo {
  file_path: string;
  className: string | null;
  function_name: string;
  input_schema: { [key: string]: { type: string; required: boolean; default: any } };
  output_schema: string[];
  docs: string | null;
}

export interface FullScanResponse {
  functions: FunctionInfo[];
}