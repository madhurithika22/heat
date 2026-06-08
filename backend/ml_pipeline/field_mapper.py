import os
import json
import requests
from dotenv import load_dotenv
from core.config import settings

# Force-load the latest environment variable variables to bypass Windows caching
load_dotenv(override=True)

class FieldMapper:
    def __init__(self):
        # Pull multiple keys from environment (comma-separated)
        raw_keys = os.getenv("GEMINI_API_KEYS") or getattr(settings, "GEMINI_API_KEYS", "")
        
        # Fallback to single key if GEMINI_API_KEYS is not set
        if not raw_keys:
            raw_keys = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
            
        # Create a list of clean, non-empty keys
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.current_key_idx = 0
        
        if not self.api_keys:
            print("WARNING: GEMINI_API_KEYS environment variable is not set!")

    def get_next_key(self):
        """Round-robin key rotation for fallback mechanism"""
        if not self.api_keys:
            return None
        key = self.api_keys[self.current_key_idx]
        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
        return key

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

        # Fallback dictionary if API fails
        fallback_data = {
            "document_metadata": {}, 
            "process_details": {}, 
            "pattern_data": [], 
            "main_table_data": [], 
            "signatures": {},
            "error": "AI Inference failed.", 
            "raw_text_dump": combined_ocr_text
        }

        if not self.api_keys:
            fallback_data["error"] = "Missing GEMINI_API_KEYS"
            return fallback_data

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        headers = {'Content-Type': 'application/json'}

        max_retries = len(self.api_keys)
        last_error = None

        print(f"Executing semantic mapping... (Pool size: {max_retries} keys)")

        for attempt in range(max_retries):
            current_key = self.get_next_key()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={current_key}"
            
            try:
                response = requests.post(url, headers=headers, json=payload)
                
                # Check specifically for quota exhaustion
                if response.status_code == 429:
                    print(f"⚠️ Mapper Quota exhausted for key ending in ...{current_key[-4:]}. Trying next key...")
                    last_error = "HTTP 429: Quota Exhausted"
                    continue
                    
                response.raise_for_status()
                
                result = response.json()
                ai_text_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Clean markdown if present
                if ai_text_response.startswith("```"):
                    ai_text_response = ai_text_response.lstrip("`").replace("json", "", 1).strip()
                    if ai_text_response.endswith("```"):
                        ai_text_response = ai_text_response.rstrip("`").strip()
                
                structured_data = json.loads(ai_text_response)
                structured_data["raw_text_dump"] = combined_ocr_text 
                
                return structured_data
                
            except requests.exceptions.HTTPError as he:
                if response.status_code == 429:
                    print(f"⚠️ Mapper Quota exhausted (HTTPError) for key ...{current_key[-4:]}. Trying next key...")
                    last_error = "HTTP 429: Quota Exhausted"
                    continue
                else:
                    print(f"AI Mapping Error (HTTP): {he}")
                    if 'response' in locals():
                        print(f"API Response: {response.text}")
                    last_error = str(he)
                    break
            except Exception as e:
                print(f"AI Mapping Error: {e}")
                last_error = str(e)
                break

        # If loop exhausts without returning, attach the last error to the fallback dict
        print(f"❌ All configured API keys failed for mapping. Last error: {last_error}")
        fallback_data["error"] = f"All API keys exhausted. Last Error: {last_error}"
        return fallback_data