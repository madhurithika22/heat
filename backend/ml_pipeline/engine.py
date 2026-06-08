import cv2
import base64
import json
import os
import requests
from .preprocessing import ImagePreprocessor
from dotenv import load_dotenv
from core.config import settings

# Force-load environment variables to clear OS caching layers
load_dotenv(override=True)

class IntelligentDocumentProcessor:
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        
        # Pull multiple keys from environment (comma-separated)
        raw_keys = os.getenv("GEMINI_API_KEYS") or getattr(settings, "GEMINI_API_KEYS", "")
        
        # Fallback to single key if GEMINI_API_KEYS is not set
        if not raw_keys:
            raw_keys = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
            
        # Create a list of clean, non-empty keys
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.current_key_idx = 0

    def get_next_key(self):
        """Round-robin key rotation for fallback mechanism"""
        if not self.api_keys:
            return None
        key = self.api_keys[self.current_key_idx]
        # Move to the next index, looping back to 0 if at the end
        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
        return key

    def process_document(self, image_path: str) -> dict:
        if not self.api_keys:    
            return {"error": "Missing GEMINI_API_KEYS. Please set the environment variable with your API keys."}

        print("1. Converting PDF/Document to Image...")
        enhanced_img, orig_img = self.preprocessor.enhance(image_path)

        print("2. Encoding image for AI Vision...")
        _, buffer = cv2.imencode('.jpg', enhanced_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        prompt = """
        You are an elite Industrial Data Extraction AI. 
        I am providing you with an image of an industrial log sheet.
        
        Read the image carefully. Read both the printed text and the handwriting. Correct any obvious typos based on the context.
        
        OUTPUT SCHEMA INSTRUCTIONS:
        You MUST return ONLY a valid JSON object matching the exact structure below. 
        Do not invent data. If a field is missing, unreadable, or empty in the image, use an empty string "".
        
        {
          "document_metadata": {
            "document_title": "Extract the main title of the document (e.g., HEAT TREATMENT LOG SHEET)",
            "cycle_no": "Extract Cycle No",
            "cycle_date": "Extract Cycle Date",
            "cycle_details": "Extract the text under Cycle Details",
            "furnace": "Extract Furnace type",
            "max_thick_loaded": "Extract Maximum Thick Loaded"
          },
          "process_details": {
            "fc_on_time": "Extract F/C On Time",
            "temp_reach_at": "Extract Temp Reach at",
            "fc_off_time": "Extract F/C OFF Time",
            "water_temp_before": "Extract Water Temp Before",
            "water_temp_after": "Extract Water Temp After",
            "quenching_sec": "Extract Quenching Sec"
          },
          "pattern_data": [
            {
              "pattern_code": "Extract Pattern Code",
              "item_name": "Extract Item Name",
              "remarks": "Extract Remarks (e.g., MAXIMUM THICKNESS 55MM)"
            }
          ],
          "main_table_data": [
            {
              "pour_date": "Extract Pour Date",
              "heat_no": "Extract Heat number",
              "grade": "Extract Grade",
              "sale_order": "Extract Sale order / Item",
              "drawing_no": "Extract Drawing No",
              "part_no": "Extract Part No",
              "description": "Extract Description",
              "qty": "Extract Qty as a number",
              "weight": "Extract Weight as a number"
            }
          ],
          "signatures": {
            "lab_in_charge": "Extract true/false if signed",
            "qa_in_charge": "Extract true/false if signed",
            "verified_sign": "Extract name of verified sign if present"
          }
        }
        
        RULES:
        1. Parse all tables carefully. Maintain row alignment even if some cells in a row are blank.
        2. For numeric fields (qty, weight), extract just the number if possible.
        3. Only output raw JSON. Do NOT wrap the output in markdown blocks like ```json ... ```. Start directly with { and end with }.
        """

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": img_base64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }
        headers = {'Content-Type': 'application/json'}

        # Ensure we don't loop forever; try each key exactly once per document
        max_retries = len(self.api_keys)
        last_error = None

        print(f"3. Sending image to Gemini 3.5 Flash Vision API (Pool size: {max_retries} keys)...")

        for attempt in range(max_retries):
            current_key = self.get_next_key()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={current_key}"
            
            try:
                response = requests.post(url, headers=headers, json=payload)
                
                # Intercept the quota exhaustion error
                if response.status_code == 429:
                    print(f"⚠️ Quota exhausted for key ending in ...{current_key[-4:]}. Trying next fallback key...")
                    last_error = f"HTTP 429: Quota Exhausted for key ...{current_key[-4:]}"
                    continue # Skip the rest of the loop and try the next key
                    
                response.raise_for_status()
                
                result = response.json()
                ai_text_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Cleanup potential markdown
                if ai_text_response.startswith("```"):
                    ai_text_response = ai_text_response.lstrip("`").replace("json", "", 1).strip()
                    if ai_text_response.endswith("```"):
                        ai_text_response = ai_text_response.rstrip("`").strip()
                
                return json.loads(ai_text_response)
                
            except requests.exceptions.HTTPError as he:
                if response.status_code == 429:
                    print(f"⚠️ Quota exhausted (HTTPError) for key ending in ...{current_key[-4:]}. Trying next fallback key...")
                    last_error = f"HTTP 429: Quota Exhausted"
                    continue
                else:
                    # For non-429 errors (like 400 Bad Request), break the loop as retrying won't help
                    last_error = str(he)
                    break 
            except Exception as e:
                # Catch parsing errors or network failures
                last_error = str(e)
                break

        # If the loop completes and we haven't returned, it means all keys failed or hit 429
        print("--- CRITICAL API DIAGNOSTIC LOG ---")
        print(f"All {max_retries} API keys exhausted or failed.")
        print(f"Last Error Recorded: {last_error}")
        print("-----------------------------------")
        return {"error": f"API Request Failed. Last error: {last_error}"}