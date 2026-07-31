# DocMind — AI Document Management Platform

A full-stack, AI-powered document intelligence platform that combines **Elasticsearch**, **ChromaDB vector search**, **large language models (LLM)**, and a **Face Recognition System (FRS)** to store, search, understand, and analyze documents and images.

> Built with FastAPI, React, Elasticsearch, ChromaDB, CLIP, and InsightFace.

---

## Features

### Core Document Management
- Upload documents (PDF, DOCX, PPTX, XLSX, TXT, images, and more)
- Automatic text extraction, OCR, and metadata capture
- Full-text search with Elasticsearch
- Tagging, filtering, and rich document detail views

### AI Intelligence
- **Summarization** — generate concise document summaries
- **Ask** — ask questions about any document
- **Chat** — conversational Q&A across your document collection
- **Translate** — translate content between languages
- **Entity Extraction** — people, organizations, emails, phones, dates, monetary values, and more
- **Auto-tagging** — automatic document classification
- **Document insights** — sentiment, urgency, risk flags, key facts

### Vector Search
- Text embeddings via `all-MiniLM-L6-v2` (384-dim)
- Image embeddings via CLIP `ViT-B-32` (512-dim)
- Semantic similarity search across text and images
- Hybrid search (keyword + vector)

### Face Recognition (FRS)
- Automatic face detection on uploaded images
- 512-dim face embeddings via InsightFace `buffalo_l`
- Face gallery with image extraction from PDFs/DOCX/PPTX
- Face search — find all documents containing a specific person

### User Management & Security
- JWT-based authentication with bcrypt password hashing
- Role-based access control (`admin`, `editor`, `viewer`)
- User CRUD (admin only)

### UI / UX
- Modern glassmorphism UI with light/dark theme toggle
- Responsive dashboard with analytics charts
- Dedicated pages: Dashboard, Documents, Upload, Search, Vector Search, Summarize, Ask, Translate, Chat, Users, Face Gallery

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐
│  React Frontend │ ──▶ │  FastAPI Backend (:8000)      │
│  (Vite / React) │     │  - Auth (JWT + bcrypt)        │
└─────────────────┘     │  - CRUD / Search / AI / FRS   │
                        └──────────┬────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┬──────────────┐
            ▼                      ▼                      ▼              ▼
   ┌──────────────┐      ┌───────────────┐      ┌───────────────┐  ┌───────────┐
   │ Elasticsearch│      │   ChromaDB    │      │  LLM / Groq   │  │   MySQL   │
   │  (documents) │      │ (chunks, img, │      │   (internet)  │  │  (users)  │
   │              │      │  face embeds) │      │   + CLIP OCR  │  │           │
   └──────────────┘      └───────────────┘      └───────────────┘  └───────────┘
```

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 18 + Vite + Tailwind | UI, routing, theming |
| Backend | FastAPI + Uvicorn | REST API, business logic |
| Search | Elasticsearch 8.x | Full-text & document store |
| Vector DB | ChromaDB | Semantic embeddings (text, image, faces) |
| User Store | MySQL 8.x | User credentials & profiles (JWT auth) |
| Text Embeddings | Sentence-Transformers `all-MiniLM-L6-v2` | 384-dim semantic vectors |
| Image Embeddings | OpenCLIP `ViT-B-32` | 512-dim image vectors |
| OCR | RapidOCR / Tesseract | Text extraction from images |
| Face Recognition | InsightFace `buffalo_l` | 512-dim face embeddings |
| LLM | Groq API (`openai/gpt-oss-120b`) | Summarize, extract, chat, translate |

---

## Getting Started

### Prerequisites

- **Docker** + Docker Compose (recommended path)
- OR **Python 3.12** + **Node.js 20+** (manual path)
- **Git**

---

### Option 1: Run with Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/A1-abhishek/AI_Intellegense.git
cd AI_Intellegense

# 2. Configure your Groq API key (free: https://console.groq.com/keys)
set GROQ_API_KEY=gsk_xxxx  # PowerShell
# or: export GROQ_API_KEY=gsk_xxxx  (Linux/macOS)

# 3. Build and start all services
docker compose up --build
```

Docker Compose starts **four services**:

| Service | Port | Description |
|---------|------|-------------|
| `elasticsearch` | 9200 | Document & full-text search |
| `mysql` | 3306 | User credentials & profiles |
| `backend` | 8000 | FastAPI REST API |
| `frontend` | 80 | React app (nginx) |

Then open your browser:

- **Frontend:** http://localhost
- **Backend API docs:** http://localhost:8000/docs

> **Note:** The first `docker compose up --build` can take several minutes while model weights (CLIP, InsightFace) are downloaded.

#### Docker environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | *(required)* | Your Groq API key |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | LLM model for AI features |
| `JWT_SECRET` | `docmind-secret-key-change-in-production-2026` | Token signing secret — **change in production** |
| `MYSQL_USER` | `docmind` | MySQL application user |
| `MYSQL_PASSWORD` | `docmind123` | MySQL application password |
| `MYSQL_DATABASE` | `docmind` | MySQL database name |

---

### Option 2: Manual / Local Development

#### 1. Start Elasticsearch

Install Elasticsearch 8.x and start it on `localhost:9200`:

```bash
# Windows
bin\elasticsearch.bat

# Linux/macOS
./bin/elasticsearch
```

#### 2. Start MySQL

User credentials are stored in MySQL. Install MySQL 8.x and create the database + user:

```sql
CREATE DATABASE IF NOT EXISTS docmind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'docmind'@'localhost' IDENTIFIED BY 'docmind123';
GRANT ALL PRIVILEGES ON docmind.* TO 'docmind'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env        # Linux/macOS
# → then edit .env and set GROQ_API_KEY

# Start the API
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend runs at **http://127.0.0.1:8000** — interactive docs at `/docs`.

#### 4. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

#### Quick-start script (Windows)

```bat
start.bat
```

This starts both backend and frontend in separate windows.

---

### Option 3: Deploy behind Apache Tomcat

DocMind ships with a Tomcat deployment pipeline that bundles the React SPA and a custom Java proxy (`APIProxyServlet` + `SPAFilter`) into Tomcat's `ROOT` webapp.

```bat
:: From the project root
deploy\deploy.bat C:\apache-tomcat-9.0.85
```

This script:
1. Builds the frontend with Vite
2. Compiles `APIProxyServlet.java` + `SPAFilter.java`
3. Packages the proxy JAR
4. Copies everything into `%TOMCAT_HOME%\webapps\ROOT`

```bash
# Start Tomcat
%TOMCAT_HOME%\bin\startup.bat
```

Then access the app at **http://localhost:8080/**.

> **API routing:** `/api/*` → proxied to `http://127.0.0.1:8000/api/*` by the Java proxy.
> A simpler variant without Java compilation is available: `deploy\deploy-simple.bat` (uses FastAPI CORS directly).

---

## Default Admin Account

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |

> **Change the default password immediately in production.**

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/health` | Service health (ES + LLM status) |
| `GET` | `/api/stats` | Global statistics |
| `POST` | `/api/documents/upload` | Upload a document |
| `GET` | `/api/documents` | List documents |
| `GET` | `/api/documents/{id}` | Get document detail |
| `PUT` | `/api/documents/{id}` | Update document |
| `DELETE` | `/api/documents/{id}` | Delete document |
| `POST` | `/api/search` | Full-text search |
| `POST` | `/api/search/vector` | Vector/semantic search |
| `POST` | `/api/ai/summarize` | Summarize content |
| `POST` | `/api/ai/ask` | Ask about a document |
| `POST` | `/api/ai/chat` | Conversational Q&A |
| `POST` | `/api/ai/translate` | Translate content |
| `POST` | `/api/ai/extract-entities` | Extract structured entities |
| `POST` | `/api/ai/auto-tags` | Auto-generate tags |
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/documents/{id}/detect-faces` | Detect faces in image |
| `POST` | `/api/search/faces` | Face similarity search |
| `GET` | `/api/faces/gallery` | Face gallery |
| `GET` | `/api/faces/stats` | Face statistics |
| `POST` | `/api/users` | Create user (admin) |

Full interactive documentation: **http://localhost:8000/docs** (Swagger UI).

---

## Project Structure

```
AI_Intellegense/
├── backend/                     # FastAPI application
│   ├── main.py                  # API routes & app entry point
│   ├── config.py                # ES / LLM / index configuration
│   ├── models.py                # Pydantic models
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment template
│   ├── services/
│   │   ├── auth.py              # JWT + bcrypt + user CRUD (MySQL)
│   │   ├── document_processor.py# Text extraction & chunking
│   │   ├── embeddings.py        # Text + CLIP image embeddings
│   │   ├── vector_store.py      # ChromaDB operations
│   │   ├── image_processor.py   # OCR + image metadata
│   │   ├── entity_extractor.py  # LLM + regex entity extraction
│   │   ├── face_recognition.py  # InsightFace wrapper
│   │   └── doc_image_extractor.py # Extract images from docs
├── frontend/                    # React application
│   ├── src/
│   │   ├── App.jsx              # Routes + layout
│   │   ├── api.js               # API client
│   │   ├── context/             # Auth & Theme providers
│   │   ├── components/          # Reusable components
│   │   └── pages/               # Page components
│   ├── package.json
│   └── vite.config.js
├── deploy/                      # Tomcat deployment tooling
│   ├── deploy.bat               # Full deployment (with Java proxy)
│   ├── deploy-simple.bat        # Simple SPA deployment
│   └── tomcat/
│       ├── java/                # Java proxy source
│       └── WEB-INF/             # web.xml, context.xml
├── docker-compose.yml           # Orchestration (ES + MySQL + backend + frontend)
├── start.bat                    # Local dev quick-start (Windows)
└── .gitignore
```

---

## Tech Stack Summary

**Frontend:** React 18, Vite 5, TailwindCSS 3, React Router 6, Recharts, Lucide Icons, react-markdown, react-hot-toast

**Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic v2, Elasticsearch client, ChromaDB, mysql-connector-python, Sentence-Transformers, OpenCLIP, PyMuPDF, python-docx, python-pptx, OpenCV, InsightFace, onnxruntime

**Infrastructure:** Docker Compose, Elasticsearch 8.x, MySQL 8.x, nginx, Apache Tomcat 9 (optional), Apache HTTP Server (optional)

---

## Security Notes

- The `.env` file (containing real secrets) is **gitignored** and never committed
- Rotate your Groq API key if it was ever exposed
- Change `JWT_SECRET`, the MySQL password, and the default admin password before any production deployment
- User passwords are stored in MySQL as **bcrypt hashes** — never in plaintext
- Face embeddings are stored locally in ChromaDB — no external service

---

## License

This project is for educational and demonstration purposes.
