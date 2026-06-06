from pydantic import BaseModel, Field
from typing import List, Optional

class DocumentMetadata(BaseModel):
    document_title: Optional[str] = ""
    cycle_no: Optional[str] = ""
    cycle_date: Optional[str] = ""
    cycle_details: Optional[str] = ""
    furnace: Optional[str] = ""
    max_thick_loaded: Optional[str] = ""

class ProcessDetails(BaseModel):
    fc_on_time: Optional[str] = ""
    temp_reach_at: Optional[str] = ""
    fc_off_time: Optional[str] = ""
    water_temp_before: Optional[str] = ""
    water_temp_after: Optional[str] = ""
    quenching_sec: Optional[str] = ""

class PatternData(BaseModel):
    pattern_code: Optional[str] = ""
    item_name: Optional[str] = ""
    remarks: Optional[str] = ""

class MainTableData(BaseModel):
    pour_date: Optional[str] = ""
    heat_no: Optional[str] = ""
    grade: Optional[str] = ""
    sale_order: Optional[str] = ""
    drawing_no: Optional[str] = ""
    part_no: Optional[str] = ""
    description: Optional[str] = ""
    qty: Optional[str] = ""
    weight: Optional[str] = ""

class Signatures(BaseModel):
    lab_in_charge: Optional[str] = ""
    qa_in_charge: Optional[str] = ""
    verified_sign: Optional[str] = ""

class ExtractedDocumentData(BaseModel):
    """
    Main schema that matches the JSON payload returned by the LLM Engine.
    """
    document_metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    process_details: ProcessDetails = Field(default_factory=ProcessDetails)
    pattern_data: List[PatternData] = Field(default_factory=list)
    main_table_data: List[MainTableData] = Field(default_factory=list)
    signatures: Signatures = Field(default_factory=Signatures)

# Used for standardizing API responses
class DocumentResponse(BaseModel):
    message: str
    filename: str
    task_id: str
    data: ExtractedDocumentData