import cv2
import base64
import json
import os
import requests
from .preprocessing import ImagePreprocessor
from dotenv import load_dotenv
from core.config import settings

class IntelligentDocumentProcessor:
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")

    def process_document(self, image_path: str) -> dict:
        if not self.api_key:    
            return {"error": "Missing GEMINI_API_KEY. Please set the environment variable or hardcode it in engine.py."}

        print("1. Converting PDF/Document to Image...")
        enhanced_img, orig_img = self.preprocessor.enhance(image_path)

        print("2. Encoding image for AI Vision...")
        _, buffer = cv2.imencode('.jpg', enhanced_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        print("3. Sending image directly to Gemini 2.5 Flash Vision API...")
        
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

        try:
            # FIX: Using gemini-2.5-flash
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            headers = {'Content-Type': 'application/json'}
            
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
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            ai_text_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
            
            if ai_text_response.startswith("```"):
                ai_text_response = ai_text_response.lstrip("`").replace("json", "", 1).strip()
                if ai_text_response.endswith("```"):
                    ai_text_response = ai_text_response.rstrip("`").strip()
            
            return json.loads(ai_text_response)
            
        except Exception as e:
            print("--- CRITICAL API DIAGNOSTIC LOG ---")
            print(f"Exception Type: {type(e)}")
            print(f"Error Message: {str(e)}")
            if 'response' in locals():
                print(f"Gemini HTTP Status Code: {response.status_code}")
                print(f"Gemini Raw Body Response: {response.text}")
            print("-----------------------------------")
            return {"error": str(e)}