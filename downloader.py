import os
import re
import time
import uuid
import logging
from typing import Dict, Any, Optional, Callable
import yt_dlp
import imageio_ffmpeg

logger = logging.getLogger("downloader")

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

# Store active download progress tasks in memory
tasks_progress: Dict[str, Dict[str, Any]] = {}

def get_platform_name(url: str) -> str:
    url_lower = url.lower()
    if "instagram.com" in url_lower or "instagr.am" in url_lower:
        return "instagram"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower or "fb.com" in url_lower:
        return "facebook"
    elif "tiktok.com" in url_lower:
        return "tiktok"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "reddit.com" in url_lower:
        return "reddit"
    elif "pinterest.com" in url_lower or "pin.it" in url_lower:
        return "pinterest"
    elif "threads.net" in url_lower:
        return "threads"
    elif "twitch.tv" in url_lower:
        return "twitch"
    elif "vimeo.com" in url_lower:
        return "vimeo"
    elif "dailymotion.com" in url_lower or "dai.ly" in url_lower:
        return "dailymotion"
    return "generic"


def get_ydl_base_opts(cookie_browser: Optional[str] = None, cookie_file: Optional[str] = None) -> Dict[str, Any]:
    opts: Dict[str, Any] = {
        'ffmpeg_location': FFMPEG_PATH,
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'logtostderr': False,
        # User-agent header to avoid platform blocks
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }
    
    if cookie_file and os.path.isfile(cookie_file):
        opts['cookiefile'] = cookie_file
    elif cookie_browser:
        # e.g., 'chrome', 'firefox', 'edge'
        opts['cookiesfrombrowser'] = (cookie_browser, )
        
    return opts


def extract_media_info(url: str, cookie_browser: Optional[str] = None, cookie_file: Optional[str] = None) -> Dict[str, Any]:
    opts = get_ydl_base_opts(cookie_browser, cookie_file)
    opts['extract_flat'] = False
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except Exception as e:
            # If cookies from browser failed or extractor failed, try fallback
            raise RuntimeError(f"Could not fetch video info: {str(e)}")
            
        if not info:
            raise RuntimeError("No media found at this URL.")

        # Check if playlist or single entry
        if 'entries' in info and info['entries']:
            info = info['entries'][0]

        # Gather resolutions available
        formats = info.get('formats', [])
        available_resolutions = set()
        has_audio = False
        
        for f in formats:
            if f.get('vcodec') != 'none' and f.get('height'):
                h = f.get('height')
                if h >= 2160:
                    available_resolutions.add('4K (2160p)')
                elif h >= 1440:
                    available_resolutions.add('2K (1440p)')
                elif h >= 1080:
                    available_resolutions.add('1080p FHD')
                elif h >= 720:
                    available_resolutions.add('720p HD')
                elif h >= 480:
                    available_resolutions.add('480p SD')
                elif h >= 360:
                    available_resolutions.add('360p')
            if f.get('acodec') != 'none':
                has_audio = True

        duration = info.get('duration')
        duration_str = ""
        if duration:
            mins, secs = divmod(int(duration), 60)
            hrs, mins = divmod(mins, 60)
            if hrs > 0:
                duration_str = f"{hrs}:{mins:02d}:{secs:02d}"
            else:
                duration_str = f"{mins:02d}:{secs:02d}"

        # Clean title
        title = info.get('title') or "Untitled Video"
        thumbnail = info.get('thumbnail') or ""
        uploader = info.get('uploader') or info.get('channel') or info.get('creator') or "Unknown Creator"
        view_count = info.get('view_count')
        platform = get_platform_name(url)

        # Sort resolutions descending
        resolution_order = ['4K (2160p)', '2K (1440p)', '1080p FHD', '720p HD', '480p SD', '360p']
        sorted_resolutions = [r for r in resolution_order if r in available_resolutions]
        if not sorted_resolutions:
            sorted_resolutions = ['Best Quality (Auto)']

        return {
            'url': url,
            'title': title,
            'uploader': uploader,
            'thumbnail': thumbnail,
            'duration': duration,
            'duration_str': duration_str,
            'view_count': view_count,
            'platform': platform,
            'extractor': info.get('extractor_key', 'Generic'),
            'resolutions': sorted_resolutions,
            'has_audio': has_audio,
        }


def download_media(
    task_id: str,
    url: str,
    format_type: str = "video",  # "video" or "audio"
    quality: str = "best",      # "best", "1080p", "720p", "480p", "360p"
    custom_dir: Optional[str] = None,
    cookie_browser: Optional[str] = None,
    cookie_file: Optional[str] = None
) -> Dict[str, Any]:
    save_dir = custom_dir if custom_dir and os.path.isdir(custom_dir) else DOWNLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    tasks_progress[task_id] = {
        'task_id': task_id,
        'status': 'starting',
        'percentage': 0,
        'speed_str': '',
        'eta_str': '',
        'downloaded_str': '',
        'total_str': '',
        'title': 'Initializing download...',
        'file_path': '',
        'filename': '',
        'error': None,
        'finished': False,
    }

    def sanitize_clean_name(name: str) -> str:
        return re.sub(r'[\\/*?:"<>|]', "", name).strip()

    def progress_hook(d):
        task = tasks_progress.get(task_id)
        if not task:
            return
            
        status = d.get('status')
        if status == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            
            percentage = 0
            if total > 0:
                percentage = round((downloaded / total) * 100, 1)
            elif d.get('_percent_str'):
                try:
                    clean_pct = re.sub(r'[^\d.]', '', d.get('_percent_str'))
                    percentage = float(clean_pct)
                except Exception:
                    percentage = 50.0

            speed = d.get('speed')
            speed_str = ""
            if speed:
                if speed > 1024 * 1024:
                    speed_str = f"{speed / (1024 * 1024):.1f} MB/s"
                elif speed > 1024:
                    speed_str = f"{speed / 1024:.0f} KB/s"
                else:
                    speed_str = f"{speed:.0f} B/s"

            eta = d.get('eta')
            eta_str = ""
            if eta:
                eta_m, eta_s = divmod(int(eta), 60)
                if eta_m > 0:
                    eta_str = f"{eta_m}m {eta_s}s"
                else:
                    eta_str = f"{eta_s}s"

            downloaded_str = f"{downloaded / (1024 * 1024):.1f} MB" if downloaded else ""
            total_str = f"{total / (1024 * 1024):.1f} MB" if total else ""

            task['status'] = 'downloading'
            task['percentage'] = min(percentage, 99.0)
            task['speed_str'] = speed_str
            task['eta_str'] = eta_str
            task['downloaded_str'] = downloaded_str
            task['total_str'] = total_str

        elif status == 'finished':
            task['status'] = 'processing'
            task['percentage'] = 99.0
            task['title'] = 'Merging & finalizing media...'

    ydl_opts = get_ydl_base_opts(cookie_browser, cookie_file)
    ydl_opts['progress_hooks'] = [progress_hook]

    # File naming template
    ydl_opts['outtmpl'] = os.path.join(save_dir, '%(title).120B [%(id)s].%(ext)s')

    if format_type == "audio":
        # Extract audio as MP3
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '320',
        }]
    else:
        # Video format selection
        if quality == "1080p":
            ydl_opts['format'] = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
        elif quality == "720p":
            ydl_opts['format'] = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best'
        elif quality == "480p":
            ydl_opts['format'] = 'bestvideo[height<=480]+bestaudio/best[height<=480]/best'
        elif quality == "360p":
            ydl_opts['format'] = 'bestvideo[height<=360]+bestaudio/best[height<=360]/best'
        elif quality == "4K":
            ydl_opts['format'] = 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best'
        else:
            # Default best
            ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best'
            
        # Ensure output is merged to mp4 for universal playback
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            downloaded_filename = ydl.prepare_filename(info)
            # If converted to mp3 or mp4, update extension
            if format_type == "audio":
                base, _ = os.path.splitext(downloaded_filename)
                downloaded_filename = base + ".mp3"
            elif ydl_opts.get('merge_output_format'):
                base, _ = os.path.splitext(downloaded_filename)
                downloaded_filename = base + f".{ydl_opts['merge_output_format']}"

            # Verify file exists
            if not os.path.isfile(downloaded_filename):
                # Search for matching file in save_dir
                base_name = os.path.splitext(os.path.basename(downloaded_filename))[0]
                for f in os.listdir(save_dir):
                    if base_name in f:
                        downloaded_filename = os.path.join(save_dir, f)
                        break

            file_size = os.path.getsize(downloaded_filename) if os.path.isfile(downloaded_filename) else 0
            size_mb = f"{file_size / (1024 * 1024):.1f} MB"

            final_data = {
                'task_id': task_id,
                'status': 'completed',
                'percentage': 100,
                'title': info.get('title', 'Video Downloaded'),
                'uploader': info.get('uploader') or info.get('channel') or "Unknown",
                'thumbnail': info.get('thumbnail', ''),
                'file_path': downloaded_filename,
                'filename': os.path.basename(downloaded_filename),
                'file_size': file_size,
                'file_size_str': size_mb,
                'format_type': format_type,
                'finished': True,
                'error': None
            }
            tasks_progress[task_id].update(final_data)
            return final_data

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Download error: {error_msg}")
        err_task = {
            'task_id': task_id,
            'status': 'error',
            'error': error_msg,
            'finished': True,
            'percentage': 0
        }
        tasks_progress[task_id].update(err_task)
        return err_task


def get_download_task_progress(task_id: str) -> Dict[str, Any]:
    return tasks_progress.get(task_id, {
        'task_id': task_id,
        'status': 'not_found',
        'error': 'Task not found'
    })


def list_downloaded_files(custom_dir: Optional[str] = None) -> list:
    target_dir = custom_dir if custom_dir and os.path.isdir(custom_dir) else DOWNLOAD_DIR
    if not os.path.isdir(target_dir):
        return []

    media_extensions = ('.mp4', '.mkv', '.webm', '.avi', '.mov', '.mp3', '.m4a', '.wav', '.flac')
    results = []

    for fname in os.listdir(target_dir):
        full_path = os.path.join(target_dir, fname)
        if os.path.isfile(full_path) and fname.lower().endswith(media_extensions):
            stat = os.stat(full_path)
            size_mb = f"{stat.st_size / (1024 * 1024):.1f} MB"
            mod_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat.st_mtime))
            is_audio = fname.lower().endswith(('.mp3', '.m4a', '.wav', '.flac'))
            
            results.append({
                'filename': fname,
                'filepath': full_path,
                'size_bytes': stat.st_size,
                'size_str': size_mb,
                'mtime': stat.st_mtime,
                'date_str': mod_time,
                'type': 'audio' if is_audio else 'video'
            })

    results.sort(key=lambda x: x['mtime'], reverse=True)
    return results
