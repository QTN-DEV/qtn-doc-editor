import sys
sys.path.append(r'C:\Users\evo22\Desktop\Projects\leveled-code-editor\backend')
from src.services.scan_service import scan_for_functions

file_content = '''from fastapi import FastAPI

app = FastAPI()

@app.get("/world")
async def read_root():
    """Return hello world."""
    return {"message": "Hello, world!"}

@app.get("/world")
async def hello(name: str, age: int = 30) -> str:
    """Returns a simple greeting."""
    return f"Hello, {name}! You are {age} years old."

class MyClass:
    def my_method(self, value: float) -> bool:
        """A sample method."""
        return value > 0
'''

with open('test_file.py', 'w') as f:
    f.write(file_content)

functions = scan_for_functions('test_file.py')
print(functions)