````md
---
title: Heat Treatment API
emoji: 🔥
colorFrom: red
colorTo: orange
sdk: docker
pinned: false
app_port: 7860
---

# 🔥 Heat Treatment Backend API

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Deployment](https://img.shields.io/badge/Deployed_on-Hugging_Face-orange.svg)](https://huggingface.co/spaces)

A production-ready FastAPI backend for the **Intelligent Document Processing (IDP)** platform, designed to extract, analyze, and structure data from industrial **Heat Treatment Log Sheets** using OCR, AI-powered reasoning, and automated document intelligence workflows.

---

# 📌 Overview

The Heat Treatment Backend API serves as the core processing engine of the IDP platform. It receives scanned heat treatment documents, extracts both printed and handwritten information, intelligently maps extracted values into predefined schemas, and stores the final structured output in MongoDB.

The system combines traditional computer vision techniques with modern Large Language Models (LLMs) to achieve high extraction accuracy even when dealing with noisy, handwritten, or semi-structured industrial documents.

---

# ✨ Features

## 📄 Automated Document Processing

- Upload heat treatment log sheets in image format.
- Supports scanned documents and photographed sheets.
- Handles complex layouts and tabular structures.

## 🔍 OCR-Based Data Extraction

### Printed Text Recognition

- Powered by **PaddleOCR**
- High accuracy for industrial forms and machine-generated text.
- Robust against varying document quality.

### Handwritten Text Recognition

- Powered by **Microsoft TrOCR**
- Extracts handwritten operator entries and annotations.
- Supports mixed handwritten and printed content.

## 🧠 Intelligent Field Mapping

- Uses **Google Gemini** for contextual reasoning.
- Maps extracted OCR text into structured JSON fields.
- Resolves ambiguities in field names and values.
- Handles semi-structured and inconsistent document layouts.

## 🏗️ Structured Data Generation

- Converts raw OCR output into:
  - Batch details
  - Furnace information
  - Temperature records
  - Time records
  - Material details
  - Operator details
  - Quality parameters

## 🗄️ MongoDB Integration

- Stores processed document data.
- Enables retrieval and future analytics.
- Supports scalable cloud deployments.

## ⚡ High-Performance API

- Built using FastAPI.
- Asynchronous request handling.
- Automatic request validation.
- OpenAPI-compliant documentation.

## 🚀 Automated Deployment

- Docker-based deployment pipeline.
- Hosted on Hugging Face Spaces.
- GitHub Actions powered CI/CD workflow.

---

# 🛠️ Technology Stack

## Backend Framework

| Component | Technology |
|------------|------------|
| API Framework | FastAPI |
| Validation | Pydantic |
| ASGI Server | Uvicorn |

---

## Machine Learning & AI

| Component | Technology |
|------------|------------|
| Computer Vision | OpenCV |
| OCR (Printed Text) | PaddleOCR |
| OCR (Handwriting) | TrOCR |
| LLM Reasoning | Google Gemini |
| Deep Learning | Transformers |

---

## Database

| Component | Technology |
|------------|------------|
| Database | MongoDB |
| Driver | PyMongo |

---

## Deployment

| Component | Technology |
|------------|------------|
| Containerization | Docker |
| Hosting | Hugging Face Spaces |
| CI/CD | GitHub Actions |

---

# 🏗️ System Architecture

```text
                ┌────────────────────┐
                │   Frontend Client  │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │   FastAPI Backend  │
                └─────────┬──────────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼

 ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │ Image Upload │ │ OCR Pipeline │ │ Gemini Mapper│
 └──────────────┘ └──────────────┘ └──────────────┘
                         │
                         ▼
                ┌────────────────────┐
                │ Structured JSON    │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │     MongoDB        │
                └────────────────────┘
````

---

# 📁 Project Structure

```text
backend/
│
├── api/
│   └── v1/
│       └── documents/
│
├── core/
│   ├── config.py
│   ├── exceptions.py
│   └── error_handlers.py
│
├── database/
│   ├── mongodb.py
│   ├── repository.py
│   └── collections.py
│
├── ml_pipeline/
│   ├── preprocessing/
│   ├── ocr/
│   ├── handwriting/
│   ├── mapping/
│   └── postprocessing/
│
├── schemas/
│   ├── request_models.py
│   └── response_models.py
│
├── main.py
├── requirements.txt
├── Dockerfile
└── README.md
```

---

# 🚀 Local Development Setup

## Prerequisites

Ensure the following are installed on your machine:

### Software Requirements

* Python 3.10+
* Git
* MongoDB Atlas Account (Recommended)

### API Requirements

* Google Gemini API Key

### System Dependencies

Required for OpenCV and OCR libraries:

#### Ubuntu/Debian

```bash
sudo apt update

sudo apt install -y \
libgl1 \
libglib2.0-0
```

#### Windows

No additional installation is typically required.

---

# 📥 Installation

## Step 1: Clone Repository

```bash
git clone <your-repository-url>
cd backend
```

---

## Step 2: Create Virtual Environment

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python -m venv venv
source venv/bin/activate
```

---

## Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

---

# ⚙️ Environment Configuration

Create a `.env` file in the root backend directory.

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority

DB_NAME=idp_production

GEMINI_API_KEY=your_gemini_api_key
```

---

## Environment Variables

| Variable       | Description                     |
| -------------- | ------------------------------- |
| MONGO_URI      | MongoDB Atlas connection string |
| DB_NAME        | MongoDB database name           |
| GEMINI_API_KEY | Google Gemini API key           |

---

# ▶️ Running the Application

Start the FastAPI server:

```bash
uvicorn main:app --reload --port 8085
```

Expected output:

```text
INFO:     Uvicorn running on http://127.0.0.1:8085
```

---

# 📚 API Documentation

Once the application starts, FastAPI automatically generates interactive API documentation.

### Swagger UI

```text
http://127.0.0.1:8085/docs
```

### ReDoc

```text
http://127.0.0.1:8085/redoc
```

---

# 🔄 Processing Workflow

## 1. Document Upload

User uploads a heat treatment log sheet.

↓

## 2. Image Preprocessing

* Noise reduction
* Image enhancement
* Region detection

↓

## 3. OCR Extraction

### PaddleOCR

Extracts:

* Printed text
* Tables
* Labels

### TrOCR

Extracts:

* Handwritten entries
* Notes
* Operator remarks

↓

## 4. Gemini-Based Mapping

Gemini receives OCR output and:

* Understands document structure
* Identifies fields
* Maps values to schema

↓

## 5. JSON Generation

Produces structured output.

Example:

```json
{
  "batch_no": "HT-2026-001",
  "material": "EN24",
  "temperature": "850°C",
  "holding_time": "2 Hours",
  "operator": "John"
}
```

↓

## 6. MongoDB Storage

Processed records are persisted for future retrieval and analytics.

---

# 🐳 Docker Deployment

Build Docker image:

```bash
docker build -t heat-treatment-api .
```

Run container:

```bash
docker run -p 7860:7860 heat-treatment-api
```

---

# ☁️ Deployment on Hugging Face Spaces

This project is deployed using the **Docker SDK** available in Hugging Face Spaces.

## Step 1: Create a Space

* Create a new Hugging Face Space.
* Select **Docker** as the SDK.

---

## Step 2: Configure Secrets

Navigate to:

```text
Space Settings → Variables and Secrets
```

Add:

```env
MONGO_URI=your_mongodb_uri

DB_NAME=idp_production

GEMINI_API_KEY=your_gemini_api_key
```

---

## Step 3: Connect GitHub Repository

Link the repository containing the backend source code.

---

## Step 4: Enable Automatic Deployment

Every push to the `main` branch triggers:

```text
.github/workflows/hf-sync.yml
```

which automatically:

1. Syncs source code.
2. Builds Docker image.
3. Deploys the latest version.
4. Restarts the Hugging Face Space.

---

# 🔄 CI/CD Pipeline

```text
Developer Push
        │
        ▼
GitHub Repository
        │
        ▼
GitHub Actions
        │
        ▼
Hugging Face Sync Workflow
        │
        ▼
Docker Build
        │
        ▼
Hugging Face Space Deployment
        │
        ▼
Production API
```

---

# 🔐 Security Best Practices

* Never commit `.env` files.
* Store API keys in Hugging Face Secrets.
* Restrict MongoDB access via IP whitelisting.
* Rotate API keys periodically.
* Enable HTTPS for production deployments.

---

# 📈 Future Enhancements

* Multi-document batch processing
* PDF support
* Advanced table extraction
* Document analytics dashboard
* Real-time processing queue
* Audit logging
* Role-based access control (RBAC)
* OCR confidence scoring
* Heat treatment trend analysis

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/new-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push to your branch.

```bash
git push origin feature/new-feature
```

5. Open a Pull Request.

---

# 📝 License

This project is licensed under the MIT License.

---

# 👨‍💻 Authors

Developed for industrial-grade Intelligent Document Processing (IDP) workflows focused on Heat Treatment Log Sheet digitization and analytics.

---

# ⭐ Support

If this project helps your organization or research, consider giving the repository a star and contributing improvements.

Happy Coding! 🔥

```
```
