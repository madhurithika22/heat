import os
import requests
from dotenv import load_dotenv

# 1. Force load the .env file
load_dotenv(override=True)

# 2. Tell Python to look for the NAME of the variable, not the key itself
API_KEY = os.getenv("GEMINI_API_KEY")

# 3. Safety check: Print the first few characters to prove it loaded!
if API_KEY:
    print(f"DEBUG: Successfully loaded key starting with: {API_KEY[:10]}...\n")
else:
    print("DEBUG: API_KEY is still None. The .env file is not being read properly.\n")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print("✅ YOUR KEY HAS ACCESS TO THESE MODELS:")
    for model in data.get('models', []):
        if 'generateContent' in model.get('supportedGenerationMethods', []):
            print(f" - {model['name'].replace('models/', '')}")
else:
    print("❌ ERROR:", response.json())