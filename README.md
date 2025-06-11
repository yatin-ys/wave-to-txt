# WaveToTxt

This repository contains a full-stack application with a Python backend powered by FastAPI and a TypeScript/React frontend built with Vite.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Python** (v3.11 or newer)
*   **uv** (The Python package manager used for this project. [Installation Guide](https://github.com/astral-sh/uv))
*   **Node.js** (v18 or newer) and **npm**

---

## Project Setup

Follow these steps to set up the development environment for both the backend and frontend.

### 1. Clone the Repository

```bash
git clone https://github.com/yatin-ys/wave-to-txt.git
cd wave-to-txt
```
### 2. Configure `.env`

1. Backend
```bash
ALLOWED_ORIGINS=http://localhost:5173
```

2. Frontend
```bash
VITE_API_URL=http://localhost:8000/api
```

### 3. Configure the Backend

The backend uses `uv` for environment and package management.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
uv venv

# Install dependencies from pyproject.toml
uv sync
```

### 4. Configure the Frontend

The frontend uses `npm` for package management.

```bash
# Navigate to the frontend directory from the root
cd frontend

# Install dependencies
npm install
```

## Running the Application

To run the application, you will need two separate terminal windows: one for the backend and one for the frontend.

### Terminal 1: Run the Backend API

```bash
# Navigate to the backend directory
cd backend

# Start the development server with hot-reloading
fastapi dev main.py
```
The backend API will be running at http://localhost:8000. You can test it by visiting http://localhost:8000/api/healthcheck in your browser.

### Terminal 2: Run the Frontend App

```bash
# Navigate to the frontend directory
cd frontend

# Start the Vite development server
npm run dev
```

The React application will be available at http://localhost:5173.
