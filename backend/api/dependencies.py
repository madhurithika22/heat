from database.connection import db_client
from core.config import settings

async def get_db():
    """Dependency to yield the active MongoDB instance or None if offline."""
    if not db_client.client:
        return None
    try:
        # Return DB handle
        return db_client.client[settings.DB_NAME]
    except Exception:
        return None