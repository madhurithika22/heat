FROM python:3.10

WORKDIR /app

# Install required system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the remaining backend files
COPY . .

# Create the uploads directory and give it global write permissions
# (This is required for Hugging Face Spaces to save temporary uploaded files)
RUN mkdir -p uploads && chmod 777 uploads

# Run the FastAPI app on port 7860 (Hugging Face's default port)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]