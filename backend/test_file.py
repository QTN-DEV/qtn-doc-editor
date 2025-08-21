from fastapi import FastAPI

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
