from typing import Dict, Any, List

class DocumentRepository:
    def __init__(self, db):
        self.collection = db.processed_documents if db is not None else None

    async def save_document(self, task_id: str, data: Dict[str, Any]):
        record = {
            "task_id": task_id, 
            "status": "COMPLETED", 
            "extracted_data": data
        }
        
        if self.collection is None:
            raise Exception("Database connection is not initialized. Cannot save document.")
            
        try:
            await self.collection.update_one(
                {"task_id": task_id}, 
                {"$set": record}, 
                upsert=True
            )
            print("Successfully saved processed document to MongoDB.")
        except Exception as e:
            print(f"MongoDB write failed: {e}")
            raise e

    async def get_document(self, task_id: str) -> Dict[str, Any]:
        if self.collection is None:
            raise Exception("Database connection is not initialized. Cannot get document.")
            
        try:
            return await self.collection.find_one({"task_id": task_id}, {"_id": 0})
        except Exception as e:
            print(f"MongoDB fetch failed: {e}")
            raise e

    async def get_all_documents(self) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []
            
        try:
            cursor = self.collection.find({}, {"_id": 0})
            documents = await cursor.to_list(length=1000)
            return documents
        except Exception as e:
            print(f"MongoDB fetch all failed: {e}")
            return []