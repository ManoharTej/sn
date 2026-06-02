import uvicorn
import os
import sys

# Add the current directory to sys.path so 'app' can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    print("Starting CSA Training API Server...")
    print("Access the API at http://127.0.0.1:8000")
    print("Documentation at http://127.0.0.1:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
