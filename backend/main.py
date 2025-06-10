from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize the FastAPI app
app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ---
# This is a CRITICAL step for frontend-backend communication.
# It tells the backend to allow requests from our Next.js frontend.

# Define the list of origins that are allowed to make requests.
# In development, our Next.js app runs on http://localhost:3000.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specified origins
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- API Endpoints ---


@app.get("/")
def read_root():
    """A simple root endpoint to check if the server is running."""
    return {"status": "FastAPI server is running!"}


@app.get("/api/message")
async def get_api_message():
    """
    This is the main endpoint our Next.js frontend will call.
    It returns a simple JSON response.
    """
    return {"message": "Hello from the FastAPI Backend! 🚀"}
