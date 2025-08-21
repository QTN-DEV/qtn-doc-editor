"""Test script to verify .levelerignore functionality in scan_controller."""

import tempfile
import os
from pathlib import Path
from src.controllers.scan_controller import _should_ignore_file

def test_levelerignore_patterns():
    """Test various .levelerignore patterns."""
    
    # Create a temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_path = Path(temp_dir)
        
        # Create .levelerignore file with test patterns
        levelerignore_content = """
# This is a comment
test_file.py
/absolute_path.py
temp/
__pycache__/
*.pyc
        """.strip()
        
        (repo_path / ".levelerignore").write_text(levelerignore_content)
        
        # Test cases
        test_cases = [
            ("test_file.py", True, "Exact file match"),
            ("other_file.py", False, "Non-matching file"),
            ("absolute_path.py", True, "Absolute path from root"),
            ("subdir/absolute_path.py", False, "Absolute path in subdirectory"),
            ("temp/some_file.py", True, "File in ignored directory"),
            ("temp/subdir/file.py", True, "File in nested ignored directory"),
            ("__pycache__/file.py", True, "File in __pycache__ directory"),
            ("src/__pycache__/file.py", True, "File in nested __pycache__ directory"),
            ("src/temp/file.py", True, "File in nested temp directory"),
            ("normal/file.py", False, "File in normal directory"),
        ]
        
        print("Testing .levelerignore pattern matching:")
        print("=" * 50)
        
        for file_path, expected, description in test_cases:
            result = _should_ignore_file(repo_path, file_path)
            status = "✓" if result == expected else "✗"
            print(f"{status} {description}: {file_path} -> {result} (expected: {expected})")
            
            if result != expected:
                print(f"  ERROR: Expected {expected}, got {result}")
        
        print("\nTest completed!")

if __name__ == "__main__":
    test_levelerignore_patterns()
