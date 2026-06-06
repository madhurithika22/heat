import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)
key = os.getenv("GEMINI_API_KEY")

models = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest"
]

print("Testing available models for quota status:")
for m in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": "Hello, return just one word."}]}]
    }
    try:
        r = requests.post(url, headers=headers, json=payload)
        status = r.status_code
        if status == 200:
            res_text = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            print(f"✅ {m}: SUCCESS (Status {status}) -> '{res_text}'")
        else:
            err_msg = r.json().get('error', {}).get('message', 'Unknown error')
            print(f"❌ {m}: FAILED (Status {status}) -> {err_msg[:100]}")
    except Exception as e:
        print(f"💥 {m}: EXCEPTION -> {e}")
