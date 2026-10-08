import os
import sys
import json
import asyncio
import subprocess
import threading
import uuid
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import downloader

app = FastAPI(title="URL Video Download - Universal Video Downloader")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=4)

# Config store
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
SUPPORT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "support_tickets.json")

DEFAULT_CONFIG = {
    "download_dir": downloader.DOWNLOAD_DIR,
    "cookie_browser": None,  # "chrome", "firefox", "edge", etc.
    "cookie_file": None,
    "default_quality": "best",
    "auto_paste": True,
    "notifications": True,
    "contact_email": "satyabit7379@gmail.com"
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        except Exception:
            return DEFAULT_CONFIG
    return DEFAULT_CONFIG

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

current_config = load_config()

# Models
class InfoRequest(BaseModel):
    url: str
    cookie_browser: Optional[str] = None

class DownloadRequest(BaseModel):
    url: str
    format_type: str = "video"  # "video" or "audio"
    quality: str = "best"      # "best", "1080p", "720p", "480p", "360p", "4K"
    cookie_browser: Optional[str] = None

class ActionRequest(BaseModel):
    filename: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    download_dir: Optional[str] = None
    cookie_browser: Optional[str] = None
    default_quality: Optional[str] = None
    auto_paste: Optional[bool] = None
    notifications: Optional[bool] = None
    contact_email: Optional[str] = None

class SupportRequest(BaseModel):
    name: str
    email: str
    category: str  # "download_issue", "website_bug", "feature_request", "other"
    platform: Optional[str] = "generic"
    video_url: Optional[str] = ""
    message: str


@app.post("/api/info")
async def get_media_info(req: InfoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    cookie_browser = req.cookie_browser or current_config.get("cookie_browser")
    cookie_file = current_config.get("cookie_file")
    
    loop = asyncio.get_event_loop()
    try:
        info = await loop.run_in_executor(
            executor,
            downloader.extract_media_info,
            url,
            cookie_browser,
            cookie_file
        )
        return info
    except Exception as e:
        err_msg = str(e)
        if "login" in err_msg.lower() or "private" in err_msg.lower():
            detail = "This video or story is private or requires authentication. Please enable Browser Cookies (Chrome/Edge/Firefox) in Settings."
        else:
            detail = f"Unable to fetch video information: {err_msg}"
        raise HTTPException(status_code=400, detail=detail)


@app.post("/api/download")
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    task_id = str(uuid.uuid4())
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    cookie_browser = req.cookie_browser or current_config.get("cookie_browser")
    cookie_file = current_config.get("cookie_file")

    def run_download():
        downloader.download_media(
            task_id=task_id,
            url=url,
            format_type=req.format_type,
            quality=req.quality,
            custom_dir=save_dir,
            cookie_browser=cookie_browser,
            cookie_file=cookie_file
        )

    executor.submit(run_download)

    return {
        "task_id": task_id,
        "status": "started",
        "url": url,
        "format_type": req.format_type,
        "quality": req.quality
    }


@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    task = downloader.get_download_task_progress(task_id)
    return task


@app.get("/api/progress/{task_id}")
async def progress_stream(task_id: str):
    async def event_generator():
        last_data = ""
        while True:
            task = downloader.get_download_task_progress(task_id)
            current_data = json.dumps(task)
            if current_data != last_data:
                yield f"data: {current_data}\n\n"
                last_data = current_data
                
            if task.get("finished") or task.get("status") in ("completed", "error", "not_found"):
                break
                
            await asyncio.sleep(0.4)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/downloads")
async def get_downloads_list():
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    files = downloader.list_downloaded_files(save_dir)
    return {
        "download_dir": save_dir,
        "count": len(files),
        "files": files
    }


@app.post("/api/open-folder")
async def open_download_folder(req: ActionRequest):
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    target_path = save_dir
    
    if req.filename:
        file_path = os.path.join(save_dir, req.filename)
        if os.path.isfile(file_path):
            target_path = file_path

    try:
        if os.path.isfile(target_path):
            # Highlight file in Windows Explorer
            subprocess.run(['explorer', f'/select,{os.path.normpath(target_path)}'])
        else:
            subprocess.run(['explorer', os.path.normpath(save_dir)])
        return {"status": "success", "opened": target_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/open-file")
async def open_file(req: ActionRequest):
    if not req.filename:
        raise HTTPException(status_code=400, detail="Filename required")
        
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    file_path = os.path.join(save_dir, req.filename)
    
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.startfile(file_path)
        return {"status": "success", "file": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stream/{filename}")
async def stream_media(filename: str):
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    file_path = os.path.join(save_dir, filename)
    
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)


@app.get("/api/download-file/{filename}")
async def download_file_direct(filename: str):
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    file_path = os.path.join(save_dir, filename)
    
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")


@app.delete("/api/downloads/{filename}")
async def delete_downloaded_file(filename: str):
    save_dir = current_config.get("download_dir", downloader.DOWNLOAD_DIR)
    file_path = os.path.join(save_dir, filename)
    
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
async def get_settings():
    return current_config


@app.post("/api/settings")
async def update_settings(cfg: ConfigUpdateRequest):
    global current_config
    if cfg.download_dir:
        normalized_dir = os.path.abspath(cfg.download_dir.strip())
        os.makedirs(normalized_dir, exist_ok=True)
        current_config["download_dir"] = normalized_dir
    if cfg.cookie_browser is not None:
        current_config["cookie_browser"] = cfg.cookie_browser if cfg.cookie_browser != "none" else None
    if cfg.default_quality:
        current_config["default_quality"] = cfg.default_quality
    if cfg.auto_paste is not None:
        current_config["auto_paste"] = cfg.auto_paste
    if cfg.notifications is not None:
        current_config["notifications"] = cfg.notifications
    if cfg.contact_email:
        current_config["contact_email"] = cfg.contact_email.strip()

    save_config(current_config)
    return current_config


@app.post("/api/reset-download-dir")
async def reset_download_dir():
    global current_config
    current_config["download_dir"] = downloader.DOWNLOAD_DIR
    save_config(current_config)
    return {"status": "success", "download_dir": downloader.DOWNLOAD_DIR}


@app.post("/api/support")
async def submit_support_ticket(req: SupportRequest):
    import time
    if not req.name.strip() or not req.email.strip() or not req.message.strip():
        raise HTTPException(status_code=400, detail="Name, Email, and Message fields are required.")

    ticket = {
        "id": f"TICK-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "name": req.name.strip(),
        "email": req.email.strip(),
        "category": req.category,
        "platform": req.platform or "generic",
        "video_url": req.video_url.strip() if req.video_url else "",
        "message": req.message.strip(),
        "status": "received"
    }

    tickets = []
    if os.path.exists(SUPPORT_FILE):
        try:
            with open(SUPPORT_FILE, "r", encoding="utf-8") as f:
                tickets = json.load(f)
        except Exception:
            tickets = []

    tickets.insert(0, ticket)
    with open(SUPPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(tickets, f, indent=2)

    return {
        "status": "success",
        "ticket_id": ticket["id"],
        "message": "Your support request has been received! We will follow up with you shortly.",
        "support_email": current_config.get("contact_email", "satyabit7379@gmail.com")
    }


@app.get("/api/support/tickets")
async def get_support_tickets():
    if os.path.exists(SUPPORT_FILE):
        try:
            with open(SUPPORT_FILE, "r", encoding="utf-8") as f:
                tickets = json.load(f)
                return {"count": len(tickets), "tickets": tickets}
        except Exception:
            return {"count": 0, "tickets": []}
    return {"count": 0, "tickets": []}


def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@app.get("/api/network-info")
async def get_network_info():
    ip = get_local_ip()
    port = 8000
    mobile_url = f"http://{ip}:{port}"
    return {
        "local_ip": ip,
        "port": port,
        "mobile_url": mobile_url,
        "qr_url": f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={mobile_url}"
    }

# Mount static assets
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.isfile(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>URL Video Download is starting...</h1>")


if __name__ == "__main__":
    import uvicorn
    import webbrowser

    port = 8000
    local_ip = get_local_ip()
    print(f"==================================================")
    print(f"  URL Video Download Server Running!")
    print(f"  Laptop / Desktop:  http://localhost:{port}")
    print(f"  Mobile Phone (Wi-Fi): http://{local_ip}:{port}")
    print(f"  Downloaded videos: {downloader.DOWNLOAD_DIR}")
    print(f"==================================================")

    # Open browser automatically after a short delay
    def open_browser():
        import time
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{port}")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
