from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from core.config import settings
from ml_pipeline.engine import IntelligentDocumentProcessor
from api.dependencies import get_db
from database.repository import DocumentRepository
import aiofiles
import os
import uuid
import io
import pandas as pd

router = APIRouter()

# Load the ML engine directly into the API memory (Bypassing Celery/Redis)
print("Loading ML Models directly into FastAPI...")
ocr_engine = IntelligentDocumentProcessor()

@router.post("/documents/process")
async def upload_and_process_document(file: UploadFile = File(...), db = Depends(get_db)):
    """
    Accepts an industrial scan and processes it IMMEDIATELY, 
    returning the extracted JSON data and storing it in the database.
    """
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use JPG, PNG, or PDF.")

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        extracted_results = await run_in_threadpool(ocr_engine.process_document, file_path)
        
        # Enhanced debugging log
        print(f"DEBUG - Extracted results payload: {extracted_results}")
        
        if isinstance(extracted_results, dict) and "error" in extracted_results:
            raise HTTPException(
                status_code=422, 
                detail=f"AI Extraction Pipeline Error: {extracted_results['error']}"
            )
            
        # Save to database (MongoDB with automatic local JSON fallback)
        task_id = uuid.uuid4().hex
        repo = DocumentRepository(db)
        await repo.save_document(task_id, extracted_results)
        
        return {
            "message": "Document processed successfully",
            "filename": unique_filename,
            "task_id": task_id,
            "data": extracted_results 
        }
    except HTTPException as he:
        # Do not let our explicit HTTP exceptions get swallowed by the generic 500 block
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed inside route: {str(e)}")

@router.get("/documents")
async def get_all_processed_documents(db = Depends(get_db)):
    """
    Retrieves all processed document records from the database or local file fallback.
    """
    try:
        repo = DocumentRepository(db)
        records = await repo.get_all_documents()
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve records: {str(e)}")

@router.get("/documents/export")
async def export_all_data_to_excel(db = Depends(get_db)):
    """
    Aggregates all processed document records, converts to an Excel sheet,
    and returns it as a downloadable attachment with structural verification safety.
    Updated for Heat Treatment Log Sheets.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection is not initialized.")
        
    try:
        # Added $match guard to ensure we only target documents that actually contain table arrays
        pipeline = [
            {
                '$match': {
                    'extracted_data.main_table_data': {'$exists': True, '$type': 'array'}
                }
            },
            {
                '$unwind': '$extracted_data.main_table_data'
            }, 
            {
                '$project': {
                    '_id': 0, 
                    'pour_date': {'$ifNull': ['$extracted_data.main_table_data.pour_date', 'N/A']}, 
                    'heat_no': {'$ifNull': ['$extracted_data.main_table_data.heat_no', 'N/A']}, 
                    'grade': {'$ifNull': ['$extracted_data.main_table_data.grade', 'N/A']}, 
                    'sale_order': {'$ifNull': ['$extracted_data.main_table_data.sale_order', 'N/A']}, 
                    'drawing_no': {'$ifNull': ['$extracted_data.main_table_data.drawing_no', '']}, 
                    'part_no': {'$ifNull': ['$extracted_data.main_table_data.part_no', '']}, 
                    'description': {'$ifNull': ['$extracted_data.main_table_data.description', '']}, 
                    'qty': {'$ifNull': ['$extracted_data.main_table_data.qty', '']}, 
                    'weight': {'$ifNull': ['$extracted_data.main_table_data.weight', '']},
                    'cycle_no': {'$ifNull': ['$extracted_data.document_metadata.cycle_no', 'N/A']},
                    'cycle_date': {'$ifNull': ['$extracted_data.document_metadata.cycle_date', 'N/A']},
                    'furnace': {'$ifNull': ['$extracted_data.document_metadata.furnace', 'N/A']}
                }
            }
        ]
        
        collection = db["processed_documents"]
        cursor = collection.aggregate(pipeline)
        data = await cursor.to_list(length=10000)
        
        columns = [
            'pour_date', 'heat_no', 'grade', 'sale_order', 'drawing_no', 
            'part_no', 'description', 'qty', 'weight', 'cycle_no', 'cycle_date', 'furnace'
        ]

        if not data:
            df = pd.DataFrame(columns=columns)
        else:
            df = pd.DataFrame(data)
            # Guarantee columns match expected layout sequence perfectly
            df = df.reindex(columns=columns)
            
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Heat Treatment Data')
            
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=heat_treatment_data.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@router.get("/documents/status/{task_id}")
async def get_processing_status(task_id: str):
    return {"task_id": task_id, "status": "SYNC_MODE_ACTIVE", "message": "Redis is disabled. Check the main /process route for output."}