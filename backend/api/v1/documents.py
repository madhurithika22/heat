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
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection is not initialized.")
        
    try:
        # Added $match guard to ensure we only target documents that actually contain table arrays
        pipeline = [
            {
                '$match': {
                    'extracted_data.table_data': {'$exists': True, '$type': 'array'}
                }
            },
            {
                '$unwind': '$extracted_data.table_data'
            }, 
            {
                '$project': {
                    '_id': 0, 
                    'date': {'$ifNull': ['$extracted_data.table_data.date', 'N/A']}, 
                    'heat_no': {'$ifNull': ['$extracted_data.table_data.heat_no', 'N/A']}, 
                    'item': {'$ifNull': ['$extracted_data.table_data.item', 'N/A']}, 
                    'grade': {'$ifNull': ['$extracted_data.table_data.grade', 'N/A']}, 
                    'customer': {'$ifNull': ['$extracted_data.table_data.customer', 'N/A']}, 
                    'planned_pouring_weight': {'$ifNull': ['$extracted_data.table_data.planned_pouring_weight', '']}, 
                    'pouring_time_planned': {'$ifNull': ['$extracted_data.table_data.pouring_time_planned', '']}, 
                    'ladle_number': {'$ifNull': ['$extracted_data.table_data.ladle_number', '']}, 
                    'tapping_sequence': {'$ifNull': ['$extracted_data.table_data.tapping_sequence', '']}, 
                    'pouring_sequence': {'$ifNull': ['$extracted_data.table_data.pouring_sequence', '']}, 
                    'pouring_time_sec': {'$ifNull': ['$extracted_data.table_data.pouring_time_sec', '']}, 
                    'pouring_temperature': {'$ifNull': ['$extracted_data.table_data.pouring_temperature', '']}, 
                    'metal_weight_before_kg': {'$ifNull': ['$extracted_data.table_data.metal_weight_before_kg', '']}, 
                    'metal_weight_after_kg': {'$ifNull': ['$extracted_data.table_data.metal_weight_after_kg', '']}, 
                    'kno_weight': {'$ifNull': ['$extracted_data.table_data.kno_weight', '']}, 
                    'actual_liquid_poured_kg': {'$ifNull': ['$extracted_data.table_data.actual_liquid_poured_kg', '']}, 
                    'weight_diff': {'$ifNull': ['$extracted_data.table_data.weight_diff', '']}, 
                    'pouring_observation': {'$ifNull': ['$extracted_data.table_data.pouring_observation', '']}, 
                    'weight_before_cutting': {'$ifNull': ['$extracted_data.table_data.weight_before_cutting', '']}
                }
            }
        ]
        
        collection = db["processed_documents"]
        cursor = collection.aggregate(pipeline)
        data = await cursor.to_list(length=10000)
        
        columns = [
            'date', 'heat_no', 'item', 'grade', 'customer', 'planned_pouring_weight',
            'pouring_time_planned', 'ladle_number', 'tapping_sequence', 'pouring_sequence',
            'pouring_time_sec', 'pouring_temperature', 'metal_weight_before_kg',
            'metal_weight_after_kg', 'kno_weight', 'actual_liquid_poured_kg',
            'weight_diff', 'pouring_observation', 'weight_before_cutting'
        ]

        if not data:
            df = pd.DataFrame(columns=columns)
        else:
            df = pd.DataFrame(data)
            # Guarantee columns match expected layout sequence perfectly
            df = df.reindex(columns=columns)
            
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Pouring Data')
            
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=pouring_data.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@router.get("/documents/status/{task_id}")
async def get_processing_status(task_id: str):
    return {"task_id": task_id, "status": "SYNC_MODE_ACTIVE", "message": "Redis is disabled. Check the main /process route for output."}