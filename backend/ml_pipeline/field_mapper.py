import os
import json
import requests
from dotenv import load_dotenv
from core.config import settings

# Force-load the latest environment variable variables to bypass Windows caching
load_dotenv(override=True)

class FieldMapper:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("WARNING: GEMINI_API_KEY environment variable is not set!")

    def _flatten_ocr_data(self, raw_data: dict) -> str:
        """Converts the raw OCR bounding box data into a readable text dump."""
        header_text = [item.get('text', '') for item in raw_data.get("header_raw", []) if isinstance(item, dict)]
        
        table_text = []
        for row in raw_data.get("table_rows", []):
            if isinstance(row, list):
                cleaned_row = [str(cell).strip() for cell in row if str(cell).strip()]
                table_text.append(" | ".join(cleaned_row))
                
        footer_text = raw_data.get("footer_notes", [])

        return (
            "--- HEADER OCR ---\n" + "\n".join(header_text) + "\n\n"
            "--- TABLE OCR ---\n" + "\n".join(table_text) + "\n\n"
            "--- FOOTER OCR ---\n" + "\n".join(footer_text)
        )

    def map_fields(self, raw_data: dict) -> dict:
        print("Passing OCR text to Gemini AI via REST API for Semantic Mapping...")
        
        combined_ocr_text = self._flatten_ocr_data(raw_data)
        
        prompt = f"""
        You are an elite Industrial Data Extraction AI. 
        I am providing you with the raw, imperfect OCR text from a Heat Treatment Log Sheet.
        
        Your task is to semantically analyze the text, correct any obvious OCR typos, and map the values to the exact JSON schema provided. 
        Use your intelligence to align the columns properly based on the context of the flattened text.
        
        RAW OCR TEXT:
        {combined_ocr_text}
        
        OUTPUT SCHEMA INSTRUCTIONS:
        You MUST return ONLY a valid JSON object matching this exact structure. Do not invent data. If a field is missing, use an empty string "".
        
        {{
          "document_metadata": {{
            "document_title": "Extract the main title of the document",
            "cycle_no": "Extract Cycle No",
            "cycle_date": "Extract Cycle Date",
            "cycle_details": "Extract the text under Cycle Details",
            "furnace": "Extract Furnace type",
            "max_thick_loaded": "Extract Maximum Thick Loaded"
          }},
          "process_details": {{
            "fc_on_time": "Extract F/C On Time",
            "temp_reach_at": "Extract Temp Reach at",
            "fc_off_time": "Extract F/C OFF Time",
            "water_temp_before": "Extract Water Temp Before",
            "water_temp_after": "Extract Water Temp After",
            "quenching_sec": "Extract Quenching Sec"
          }},
          "pattern_data": [
            {{
              "pattern_code": "Extract Pattern Code",
              "item_name": "Extract Item Name",
              "remarks": "Extract Remarks"
            }}
          ],
          "main_table_data": [
            {{
              "pour_date": "Extract Pour Date",
              "heat_no": "Extract Heat number",
              "grade": "Extract Grade",
              "sale_order": "Extract Sale order / Item",
              "drawing_no": "Extract Drawing No",
              "part_no": "Extract Part No",
              "description": "Extract Description",
              "qty": "Extract Qty as a number",
              "weight": "Extract Weight as a number"
            }}
          ],
          "signatures": {{
            "lab_in_charge": "Extract true/false if signed",
            "qa_in_charge": "Extract true/false if signed",
            "verified_sign": "Extract name of verified sign if present"
          }}
        }}
        
        RULES:
        1. Ignore table headers.
        2. Ensure data aligns correctly into the respective arrays.
        """

        # Fallback dictionary if API fails (Updated to new schema)
        fallback_data = {
            "document_metadata": {}, 
            "process_details": {}, 
            "pattern_data": [], 
            "main_table_data": [], 
            "signatures": {},
            "error": "AI Inference failed.", 
            "raw_text_dump": combined_ocr_text
        }

        if not self.api_key:
            fallback_data["error"] = "Missing GEMINI_API_KEY"
            return fallback_data

        try:
            # FIX: Swapped out gemini-2.0-flash for gemini-2.5-flash
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            headers = {'Content-Type': 'application/json'}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            # Parse the Gemini JSON response
            result = response.json()
            ai_text_response = result['candidates'][0]['content']['parts'][0]['text']
            
            structured_data = json.loads(ai_text_response)
            structured_data["raw_text_dump"] = combined_ocr_text 
            
            return structured_data
            
        except Exception as e:
            print(f"AI Mapping Error: {e}")
            if 'response' in locals():
                print(f"API Response: {response.text}")
            return fallback_data