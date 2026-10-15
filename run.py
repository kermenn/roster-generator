"""
Launcher script for Roster Generator.
Starts the FastAPI web server and opens the browser.
"""
import sys
import os
import webbrowser
import threading
import time
import uvicorn

def open_browser():
    time.sleep(1.2)
    url = "http://127.0.0.1:8000"
    print(f"\n========================================================")
    print(f"  ⚡ Roster Generator siap digunakan!")
    print(f"  🌐 Membuka aplikasi di browser: {url}")
    print(f"========================================================\n")
    webbrowser.open(url)

if __name__ == "__main__":
    # Start thread to open browser
    threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn server
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
