---
title: Heat Treatment API
emoji: 🔥
colorFrom: red
colorTo: yellow
sdk: docker
pinned: false
app_port: 7860
---

# 🔥 Heat Treatment Backend API

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Deployment](https://img.shields.io/badge/Deployed_on-Hugging_Face-orange.svg)](https://huggingface.co/spaces)

This folder contains the FastAPI backend for the **Intelligent Document Processing (IDP)** application, specifically tailored for analyzing and extracting structured data from complex Heat Treatment log sheets.

## ✨ Key Features
* **Automated Data Extraction:** Leverages PaddleOCR for printed text and TrOCR for handwriting recognition.
* **Intelligent Mapping:** Utilizes Google's Gemini LLM for reasoning and precise field mapping from unstructured log sheets.
* **FastAPI Server:** High-performance, asynchronous REST API.
* **MongoDB Integration:** Seamless storage and retrieval of processed log sheet data.
* **Automated CI/CD:** Integrated with GitHub Actions for continuous deployment to Hugging Face Spaces.

## 🛠️ Tech Stack
* **Framework:** FastAPI
* **Machine Learning:** OpenCV, PaddleOCR, Transformers (TrOCR), Google Generative AI (Gemini)
* **Database:** MongoDB Atlas
* **Deployment:** Docker, Hugging Face Spaces
