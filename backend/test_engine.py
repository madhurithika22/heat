import os
from dotenv import load_dotenv
load_dotenv(override=True)

from ml_pipeline.engine import IntelligentDocumentProcessor

processor = IntelligentDocumentProcessor()
image_path = os.path.join("uploads", "02291db7cfad4bc090e7b11563d52970.pdf")

print(f"Testing document processor on: {image_path}")
result = processor.process_document(image_path)
print("Result:", result)
