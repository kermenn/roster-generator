"""
Launcher script for Roster Generator.
Starts the FastAPI web server and opens the browser.
"""
import sys
import os
import webbrowser
import threading
import time
import socket
import uvicorn

def get_local_ip():
    """Detect current local IP on Wi-Fi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser(local_ip):
    time.sleep(1.2)
    localhost_url = "http://127.0.0.1:8000"
    network_url = f"http://{local_ip}:8000"
    print("\n" + "=" * 60)
    print("  ⚡ Roster Generator siap digunakan!")
    print(f"  💻 Akses di Laptop ini : {localhost_url}")
    print(f"  📱 Akses dari HP/Wi-Fi  : {network_url}")
    print("=" * 60 + "\n")
    webbrowser.open(localhost_url)

if __name__ == "__main__":
    current_ip = get_local_ip()
    # Start thread to open browser
    threading.Thread(target=open_browser, args=(current_ip,), daemon=True).start()

    # Run Uvicorn server on all interfaces
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
