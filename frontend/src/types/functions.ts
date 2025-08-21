export interface ParameterDefinition {
  name: string;
  type: string;
  default: string | null;
  required: boolean;
}

export interface FunctionDefinition {
  name: string;
  parameters: ParameterDefinition[];
  return_type: string | null;
  docstring: string | null;
}

export interface ClassDefinition {
  name: string;
  superclasses: string[];
  functions: FunctionDefinition[];
}

export interface FileScanResponse {
  file_path: string;
  functions: FunctionDefinition[];
  classes: ClassDefinition[];
}

export interface FullScanResponse {
  files: FileScanResponse[];
}

// Legacy interface for backward compatibility with existing components
export interface FunctionInfo {
  file_path: string;
  className: string | null;
  function_name: string;
  input_schema: { [key: string]: { type: string; required: boolean; default: any } };
  output_schema: string[];
  docs: string | null;
}