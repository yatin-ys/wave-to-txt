# WaveToTxt

An AI-powered application that transcribes audio, generates summaries, and lets you chat with your content using Retrieval-Augmented Generation (RAG).
Built with a Python/FastAPI backend, Google Gemini models, a FAISS vector store, and a modern React/TypeScript frontend.

Live - https://wavetotxt.xyz

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10 or newer)
- **Docker Compose** (v2.0 or newer)

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

1. Copy the environment template to the root directory:

   ```bash
   cp env.template .env
   ```

2. Edit `.env` and fill in your API keys and configuration:

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

## Running the Application

With Docker Compose, you can run the entire application stack with a single command.

### Start the Application

```bash
# Build and start all services
docker-compose up --build
```

This will start:
- **Backend API** on http://localhost:8000
- **Frontend Application** on http://localhost:3000
- **Redis** for task queuing
- **Worker** for background processing

### Useful Docker Commands

```bash
# Run in detached mode (background)
docker-compose up -d

# Stop all services
docker-compose down

# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs backend

# Rebuild and restart services
docker-compose up --build
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/api/healthcheck
