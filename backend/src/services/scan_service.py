"""Service for scanning files for definitions."""

import logging
from typing import List, Literal
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ParameterDefinition(BaseModel):
    name: str
    type: str
    default: str | None = None
    required: bool = True


class FunctionDefinition(BaseModel):
    name: str
    parameters: List[ParameterDefinition] = []
    return_type: str | None = None
    docstring: str | None = None


class ClassDefinition(BaseModel):
    name: str
    superclasses: List[str]
    attributes: List[ParameterDefinition] = []
    functions: List[FunctionDefinition] = []


def scan_for_functions(
    file_path: str,
) -> tuple[List[FunctionDefinition], List[ClassDefinition]]:
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

        class_body: List[str] = []
        function_body: List[str] = []

        lines = content.splitlines()
        current_line_idx = -1

        def read_line() -> str | None:
            nonlocal current_line_idx
            current_line_idx += 1
            if current_line_idx >= len(lines):
                return None
            return lines[current_line_idx]

        current_type: Literal["class", "function"] | None = None
        current_body: List[str] = []

        while True:
            line = read_line()
            if line is None:
                break

            if (
                line.startswith("class ")
                or line.startswith("def ")
                or line.startswith("async def ")
            ):
                # Save previous body if exists
                if current_type == "class" and current_body:
                    class_body.append("\n".join(current_body))
                elif current_type == "function" and current_body:
                    function_body.append("\n".join(current_body))

                # Start new body with the definition line
                current_body = [line]
                current_type = "class" if line.startswith("class ") else "function"
            else:
                current_body.append(line)

        # Handle last body if exists
        if len(current_body) > 0:
            if current_type == "class":
                class_body.append("\n".join(current_body))
            elif current_type == "function":
                function_body.append("\n".join(current_body))

        classes: List[ClassDefinition] = []
        root_functions: List[FunctionDefinition] = []

        def parse_function_definition(function_body: str) -> FunctionDefinition:
            """Parse function definition from function body string."""
            lines = function_body.strip().split("\n")
            if not lines:
                return FunctionDefinition(name="unknown")

            # Find the function definition line and collect complete signature
            def_line = ""
            def_line_idx = -1
            signature_complete = False

            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith("def ") or stripped.startswith("async def "):
                    def_line = stripped
                    def_line_idx = i

                    # Check if the signature is complete on this line
                    if ":" in def_line:
                        signature_complete = True
                    break

            if not def_line:
                return FunctionDefinition(name="unknown")

            # If signature is not complete, collect lines until we find the closing colon
            if not signature_complete:
                for i in range(def_line_idx + 1, len(lines)):
                    line = lines[i]
                    def_line += " " + line.strip()
                    if ":" in line:
                        signature_complete = True
                        break

            if not signature_complete:
                return FunctionDefinition(name="unknown")

            # Extract function name
            func_name = ""
            if def_line.startswith("async def "):
                name_start = def_line.find("async def ") + 10
            else:
                name_start = def_line.find("def ") + 4

            name_end = def_line.find("(", name_start)
            if name_end == -1:
                return FunctionDefinition(name="unknown")

            func_name = def_line[name_start:name_end].strip()

            # Extract parameters
            param_start = def_line.find("(")
            param_end = def_line.rfind(")")

            parameters = []
            if param_start != -1 and param_end != -1 and param_end > param_start:
                param_str = def_line[param_start + 1 : param_end].strip()
                if param_str:
                    # Split parameters by comma, but handle nested brackets/parentheses
                    param_parts = []
                    current_part = ""
                    bracket_count = 0
                    paren_count = 0

                    for char in param_str:
                        if char == "," and bracket_count == 0 and paren_count == 0:
                            param_parts.append(current_part.strip())
                            current_part = ""
                        else:
                            if char == "[":
                                bracket_count += 1
                            elif char == "]":
                                bracket_count -= 1
                            elif char == "(":
                                paren_count += 1
                            elif char == ")":
                                paren_count -= 1
                            current_part += char

                    if current_part.strip():
                        param_parts.append(current_part.strip())

                    # Parse each parameter
                    for param in param_parts:
                        if not param or param == "self":
                            continue

                        param_name = ""
                        param_type = ""
                        param_default = None
                        param_required = True

                        # Check for default value
                        if "=" in param:
                            param_parts_split = param.split("=", 1)
                            param_name_type = param_parts_split[0].strip()
                            param_default = param_parts_split[1].strip()
                            param_required = False
                        else:
                            param_name_type = param.strip()

                        # Check for type annotation
                        if ":" in param_name_type:
                            name_type_parts = param_name_type.split(":", 1)
                            param_name = name_type_parts[0].strip()
                            param_type = name_type_parts[1].strip()
                        else:
                            param_name = param_name_type.strip()
                            param_type = "Any"

                        if param_name:
                            parameters.append(
                                ParameterDefinition(
                                    name=param_name,
                                    type=param_type,
                                    default=param_default,
                                    required=param_required,
                                )
                            )

            # Extract return type
            return_type = None
            arrow_pos = def_line.find("->")
            if arrow_pos != -1:
                colon_pos = def_line.find(":", arrow_pos)
                if colon_pos != -1:
                    return_type = def_line[arrow_pos + 2 : colon_pos].strip()
                else:
                    return_type = def_line[arrow_pos + 2 :].strip()
                    if return_type.endswith(":"):
                        return_type = return_type[:-1].strip()

            # Extract docstring only
            docstring = None

            # Find the actual end of the function signature to start looking for docstring
            signature_end_idx = def_line_idx
            if not signature_complete:
                signature_end_idx = def_line_idx
            else:
                # Find which line contains the colon that ends the signature
                for i in range(def_line_idx, len(lines)):
                    if ":" in lines[i]:
                        signature_end_idx = i
                        break

            # Look for docstring starting from the line after function signature
            for i in range(signature_end_idx + 1, len(lines)):
                line = lines[i]
                stripped = line.strip()

                if not stripped:
                    continue

                # Check if this line starts a docstring
                if stripped.startswith('"""') or stripped.startswith("'''"):
                    quote_type = '"""' if stripped.startswith('"""') else "'''"

                    # Check if it's a single-line docstring
                    if stripped.count(quote_type) >= 2:
                        # Extract docstring content
                        content = stripped[3:]  # Remove opening quotes
                        if content.endswith(quote_type):
                            content = content[:-3]  # Remove closing quotes
                        docstring = content.strip()
                        break
                    else:
                        # Multi-line docstring, find the end
                        docstring_content = [stripped[3:]]  # Remove opening quotes
                        for j in range(i + 1, len(lines)):
                            doc_line = lines[j].strip()
                            if doc_line.endswith(quote_type):
                                # Remove closing quotes and add to content
                                doc_line_content = (
                                    doc_line[:-3]
                                    if doc_line.endswith(quote_type)
                                    else doc_line
                                )
                                if doc_line_content:
                                    docstring_content.append(doc_line_content)
                                docstring = "\n".join(docstring_content).strip()
                                break
                            else:
                                docstring_content.append(doc_line)
                        break
                else:
                    # First non-docstring line means no docstring exists
                    break

            return FunctionDefinition(
                name=func_name,
                parameters=parameters,
                return_type=return_type,
                docstring=docstring,
            )

        def parse_class_definition(class_body: str) -> ClassDefinition:
            """Parse class definition from class body string."""
            lines = class_body.strip().split("\n")
            if not lines:
                return ClassDefinition(name="unknown", superclasses=[])

            # Find the class definition line
            class_line = ""
            class_line_idx = -1
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith("class "):
                    class_line = stripped
                    class_line_idx = i
                    break

            if not class_line:
                return ClassDefinition(name="unknown", superclasses=[])

            # Extract class name and superclasses
            class_name = ""
            superclasses = []

            # Find class name
            name_start = class_line.find("class ") + 6
            paren_pos = class_line.find("(", name_start)
            colon_pos = class_line.find(":", name_start)

            if paren_pos != -1 and (colon_pos == -1 or paren_pos < colon_pos):
                # Class has parentheses (inheritance)
                class_name = class_line[name_start:paren_pos].strip()

                # Extract superclasses
                paren_end = class_line.find(")", paren_pos)
                if paren_end != -1:
                    super_str = class_line[paren_pos + 1 : paren_end].strip()
                    if super_str:
                        # Split by comma but handle nested brackets/parentheses
                        super_parts = []
                        current_part = ""
                        bracket_count = 0
                        paren_count = 0

                        for char in super_str:
                            if char == "," and bracket_count == 0 and paren_count == 0:
                                super_parts.append(current_part.strip())
                                current_part = ""
                            else:
                                if char == "[":
                                    bracket_count += 1
                                elif char == "]":
                                    bracket_count -= 1
                                elif char == "(":
                                    paren_count += 1
                                elif char == ")":
                                    paren_count -= 1
                                current_part += char

                        if current_part.strip():
                            super_parts.append(current_part.strip())

                        superclasses = [s.strip() for s in super_parts if s.strip()]
            else:
                # Class has no parentheses
                if colon_pos != -1:
                    class_name = class_line[name_start:colon_pos].strip()
                else:
                    class_name = class_line[name_start:].strip()
                    if class_name.endswith(":"):
                        class_name = class_name[:-1].strip()

            # Parse class body for attributes and methods
            attributes = []
            methods = []

            # Track current method being parsed
            current_method_lines = []
            in_method = False
            base_indent = None

            for i in range(class_line_idx + 1, len(lines)):
                line = lines[i]
                stripped = line.strip()

                if not stripped:
                    if in_method:
                        current_method_lines.append(line)
                    continue

                # Determine base indentation level
                if base_indent is None and stripped:
                    base_indent = len(line) - len(line.lstrip())

                current_indent = len(line) - len(line.lstrip())

                # Check if this is a method definition
                if (
                    stripped.startswith("def ") or stripped.startswith("async def ")
                ) and current_indent == base_indent:
                    # Save previous method if exists
                    if in_method and current_method_lines:
                        method_body = "\n".join(current_method_lines)
                        method_def = parse_function_definition(method_body)
                        methods.append(method_def)

                    # Start new method
                    in_method = True
                    current_method_lines = [line]
                elif in_method:
                    # Add line to current method
                    current_method_lines.append(line)
                elif current_indent == base_indent and not in_method:
                    # This might be a class attribute
                    if (
                        "=" in stripped
                        and not stripped.startswith("def ")
                        and not stripped.startswith("class ")
                    ):
                        # Parse attribute
                        eq_pos = stripped.find("=")
                        attr_part = stripped[:eq_pos].strip()
                        default_part = stripped[eq_pos + 1 :].strip()

                        attr_name = ""
                        attr_type = ""

                        # Check for type annotation
                        if ":" in attr_part:
                            name_type_parts = attr_part.split(":", 1)
                            attr_name = name_type_parts[0].strip()
                            attr_type = name_type_parts[1].strip()
                        else:
                            attr_name = attr_part.strip()
                            attr_type = "Any"

                        if attr_name:
                            attributes.append(
                                ParameterDefinition(
                                    name=attr_name,
                                    type=attr_type,
                                    default=default_part,
                                    required=False,
                                )
                            )

            # Handle last method if exists
            if in_method and current_method_lines:
                method_body = "\n".join(current_method_lines)
                method_def = parse_function_definition(method_body)
                methods.append(method_def)

            return ClassDefinition(
                name=class_name,
                superclasses=superclasses,
                attributes=attributes,
                functions=methods,
            )

        for class_body_str in class_body:
            # implement string parsing to get class definition
            classes.append(parse_class_definition(class_body_str))

        for function_body_str in function_body:
            root_functions.append(parse_function_definition(function_body_str))

        logger.info(
            f"Finished scanning {file_path}. Found {len(root_functions)} functions and {len(classes)} classes."
        )
        return root_functions, classes
    except Exception as e:
        logger.error(f"Error during file scanning for {file_path}: {e}")
        raise


def update_function_docstring(
    file_path: str, function_name: str, new_docstring: str
) -> bool:
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
            if (
                stripped_line.startswith("def ") or is_async
            ) and function_name in stripped_line:
                logger.debug(f"Found target function line: {stripped_line}")
                updated_lines.append(line)  # Add the function definition line

                # Find indentation of the function
                indentation = len(line) - len(line.lstrip())
                docstring_indent = " " * (
                    indentation + 4
                )  # Standard 4 spaces for docstring

                # Check for existing docstring
                docstring_found = False
                for j in range(i + 1, len(lines)):
                    current_line = lines[j]
                    current_stripped_line = current_line.strip()
                    if current_stripped_line.startswith(
                        '"""'
                    ) or current_stripped_line.startswith("'''"):
                        docstring_found = True
                        logger.debug(f"Existing docstring found at line {j + 1}")
                        # Replace existing docstring
                        updated_lines.append(
                            f'{docstring_indent}"""{new_docstring}"""\n'
                        )
                        # Skip old docstring lines
                        if (
                            current_stripped_line.count('"""') == 2
                            or current_stripped_line.count("'''") == 2
                        ):  # Single line docstring
                            skip_lines = 1  # Single line docstring
                        else:
                            # Multi-line docstring, find its end
                            for k in range(j + 1, len(lines)):
                                skip_lines += 1
                                if lines[k].strip().endswith('"""') or lines[
                                    k
                                ].strip().endswith("'''"):
                                    skip_lines += 1
                                    break
                        docstring_updated = True
                        break
                    elif (
                        current_stripped_line.startswith("def ")
                        or current_stripped_line.startswith("class ")
                        or not current_line.startswith(" ")
                    ):
                        # Next function/class or out of scope, no docstring found
                        logger.debug(
                            f"No docstring found for {function_name} before next code block."
                        )
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
            logger.info(
                f"Docstring for {function_name} updated. Writing changes to {file_path}."
            )
            with open(file_path, "w") as f:
                f.writelines(updated_lines)
            return True
        logger.warning(f"Docstring for {function_name} not updated in {file_path}.")
        return False
    except Exception as e:
        logger.error(
            f"Error during docstring update for {function_name} in {file_path}: {e}"
        )
        raise
