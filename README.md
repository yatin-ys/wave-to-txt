# WaveToTxt

This repository contains a full-stack application with a Python backend powered by FastAPI and a TypeScript/React frontend built with Vite.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python** (v3.11 or newer)
- **uv** (The Python package manager used for this project. [Installation Guide](https://github.com/astral-sh/uv))
- **Node.js** (v18 or newer) and **npm**

---

## Project Setup

Follow these steps to set up the development environment for both the backend and frontend.

### 1. Clone the Repository

```bash
git clone https://github.com/yatin-ys/wave-to-txt.git
cd wave-to-txt
```

### 2. Configure Environment Variables

**Important**: Proper environment configuration is required for the application to work correctly.

#### Backend Configuration

1. Copy the environment template:

   ```bash
   cp env.template backend/.env
   ```

2. Edit `backend/.env` and fill in your API keys and configuration:

   ```bash
   # Required: At least one transcription service
   GROQ_API_KEY=your_groq_api_key_here
   # OR
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

   # Required: File storage (Cloudflare R2)
   R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_BUCKET_NAME=your_bucket_name

   # Required: Summarization
   GOOGLE_API_KEY=your_google_gemini_api_key_here

   # See env.template for all available options
   ```

3. **Validate your configuration**:
   ```bash
   cd backend
   python validate_env.py
   ```

#### Frontend Configuration

1. Copy the environment template:

   ```bash
   cp frontend/env.template frontend/.env
   ```

2. Edit `frontend/.env`:
   ```bash
   VITE_API_URL=http://localhost:8000/api
   ```

#### 🔍 Environment Validation

- Backend validation runs automatically on startup
- Frontend validation runs during build/dev
- Use `python backend/validate_env.py` to test backend config
- Use `npm run build` to test frontend config

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
