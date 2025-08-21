"""Service for scanning files for definitions."""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def scan_for_functions(file_path: str) -> List[Dict[str, Any]]:
    """
    Scans a Python file for function and class definitions using string matching and slicing.

    Args:
        file_path: The absolute path to the Python file.

    Returns:
        A list of dictionaries, where each dictionary represents a function
        and contains the following keys:
        - className: The name of the class if the function is a method, otherwise None.
        - function_name: The name of the function.
        - input_schema: A dictionary representing the input parameters with their types.
        - output_schema: The annotation for the return type, as a string.
        - docs: The docstring of the function, or None if not present.
    """
    logger.info(f"Scanning file: {file_path}")
    try:
        with open(file_path, "r") as source:
            content = source.read()

        functions = []
        current_class = None

        lines = content.splitlines()
        for i, line in enumerate(lines):
            stripped_line = line.strip()

            # Check for class definition
            if stripped_line.startswith("class "):
                class_name_start = stripped_line.find("class ") + len("class ")
                class_name_end = stripped_line.find("(", class_name_start)
                if class_name_end == -1:
                    class_name_end = stripped_line.find(":", class_name_start)
                
                if class_name_end != -1:
                    current_class = stripped_line[class_name_start:class_name_end].strip()
                else:
                    current_class = stripped_line[class_name_start:].strip().replace(":", "")
                logger.debug(f"Found class: {current_class}")
                continue

            # Check for function definition
            is_async = stripped_line.startswith("async def ")
            if stripped_line.startswith("def ") or is_async:
                def_keyword = "async def " if is_async else "def "
                function_name_start = stripped_line.find(def_keyword) + len(def_keyword)
                function_name_end = stripped_line.find("(", function_name_start)
                function_name = stripped_line[function_name_start:function_name_end].strip()

                params_start = function_name_end + 1
                params_end = stripped_line.find(")", params_start)
                params_str = stripped_line[params_start:params_end].strip()

                return_type = None
                if "->" in stripped_line:
                    return_type_start = stripped_line.find("->") + len("->")
                    return_type_end = stripped_line.find(":", return_type_start)
                    if return_type_end != -1:
                        return_type = stripped_line[return_type_start:return_type_end].strip()
                    else:
                        return_type = stripped_line[return_type_start:].strip()

                # Extract input parameters and their types
                input_schema = {}
                for param in params_str.split(','):
                    param = param.strip()
                    if param:
                        param_parts = param.split(':')
                        param_name = param_parts[0].strip()
                        param_type = "Any" # Default type
                        if len(param_parts) > 1:
                            type_and_default = param_parts[1].strip().split('=')
                            param_type = type_and_default[0].strip()
                        input_schema[param_name] = param_type

                output_schema = return_type if return_type else "Any"

                docs = None
                # Look for docstring in the lines immediately following the function definition
                for j in range(i + 1, len(lines)):
                    doc_line = lines[j].strip()
                    if doc_line.startswith('"""') or doc_line.startswith("'''"):
                        # Extract content between triple quotes
                        doc_start_quote = '"""' if doc_line.startswith('"""') else "'''"
                        doc_end_quote = '"""' if doc_line.endswith('"""') else "'''"

                        if doc_line.count(doc_start_quote) == 2: # Single line docstring
                            docs = doc_line.strip(doc_start_quote).strip()
                        else: # Multi-line docstring
                            current_doc_lines = [doc_line]
                            for k in range(j + 1, len(lines)):
                                current_doc_lines.append(lines[k].strip())
                                if lines[k].strip().endswith(doc_end_quote):
                                    break
                            full_doc_string = "\n".join(current_doc_lines)
                            docs = full_doc_string.strip(doc_start_quote).strip(doc_end_quote).strip()
                        logger.debug(f"Found docstring for {function_name}: {docs}")
                        break
                    # If we encounter another def, class, or non-indented line, stop looking for docstring
                    if doc_line.startswith("def ") or doc_line.startswith("class ") or not doc_line.startswith(" "):
                        break

                functions.append({
                    "className": current_class,
                    "function_name": function_name,
                    "input_schema": input_schema,
                    "output_schema": output_schema,
                    "docs": docs if docs else None,
                })
                logger.debug(f"Found function: {function_name}")

            # Reset current_class if indentation suggests we're out of class scope
            # This is a heuristic and might not be perfect for all cases
            if current_class and not line.startswith(" ") and not line.startswith("class ") and not line.startswith("def ") and not line.startswith("async def "):
                current_class = None

        logger.info(f"Finished scanning {file_path}. Found {len(functions)} functions.")
        return functions
    except Exception as e:
        logger.error(f"Error during file scanning for {file_path}: {e}")
        raise

def update_function_docstring(file_path: str, function_name: str, new_docstring: str) -> bool:
    """
    Updates the docstring of a specific function in a Python file.

    Args:
        file_path: The absolute path to the Python file.
        function_name: The name of the function to update.
        new_docstring: The new docstring content.

    Returns:
        True if the docstring was updated, False otherwise.
    """
    logger.info(f"Attempting to update docstring for {function_name} in {file_path}")
    try:
        with open(file_path, "r") as f:
            lines = f.readlines()

        updated_lines = []
        docstring_updated = False
        skip_lines = 0

        for i, line in enumerate(lines):
            if skip_lines > 0:
                skip_lines -= 1
                continue

            stripped_line = line.strip()
            
            # Check for function definition
            is_async = stripped_line.startswith("async def ")
            if (stripped_line.startswith("def ") or is_async) and function_name in stripped_line:
                logger.debug(f"Found target function line: {stripped_line}")
                updated_lines.append(line) # Add the function definition line

                # Find indentation of the function
                indentation = len(line) - len(line.lstrip())
                docstring_indent = " " * (indentation + 4) # Standard 4 spaces for docstring

                # Check for existing docstring
                docstring_found = False
                for j in range(i + 1, len(lines)):
                    current_line = lines[j]
                    current_stripped_line = current_line.strip()
                    if current_stripped_line.startswith('"""') or current_stripped_line.startswith("'''"):
                        docstring_found = True
                        logger.debug(f"Existing docstring found at line {j+1}")
                        # Replace existing docstring
                        updated_lines.append(f'{docstring_indent}"""{new_docstring}"""\n')
                        # Skip old docstring lines
                        if current_stripped_line.count('"""') == 2 or current_stripped_line.count("'''") == 2: # Single line docstring
                            skip_lines = 1 # Single line docstring
                        else:
                            # Multi-line docstring, find its end
                            for k in range(j + 1, len(lines)):
                                skip_lines += 1
                                if lines[k].strip().endswith('"""') or lines[k].strip().endswith("'''"):
                                    skip_lines += 1
                                    break
                        docstring_updated = True
                        break
                    elif current_stripped_line.startswith("def ") or current_stripped_line.startswith("class ") or not current_line.startswith(" "):
                        # Next function/class or out of scope, no docstring found
                        logger.debug(f"No docstring found for {function_name} before next code block.")
                        break
                    else:
                        # Regular code line, not a docstring
                        updated_lines.append(current_line)

                if not docstring_found:
                    logger.debug(f"Inserting new docstring for {function_name}.")
                    # Insert new docstring after function definition
                    updated_lines.append(f'{docstring_indent}"""{new_docstring}"""\n')
                    docstring_updated = True
                
                # No need for found_function = False here, as we break after finding the function

            else:
                updated_lines.append(line)

        if docstring_updated:
            logger.info(f"Docstring for {function_name} updated. Writing changes to {file_path}.")
            with open(file_path, "w") as f:
                f.writelines(updated_lines)
            return True
        logger.warning(f"Docstring for {function_name} not updated in {file_path}.")
        return False
    except Exception as e:
        logger.error(f"Error during docstring update for {function_name} in {file_path}: {e}")
        raise
