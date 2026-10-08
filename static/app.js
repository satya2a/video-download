// URL Video Download - Client Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoUrlInput = document.getElementById('videoUrlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const fetchInfoBtn = document.getElementById('fetchInfoBtn');
    const quickDownloadBtn = document.getElementById('quickDownloadBtn');
    const platformIndicator = document.getElementById('platformIndicator');
    const platformIcon = document.getElementById('platformIcon');
    const platformName = document.getElementById('platformName');

    const loadingState = document.getElementById('loadingState');
    const loadingText = document.getElementById('loadingText');
    const errorBanner = document.getElementById('errorBanner');
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    const errorCookieBtn = document.getElementById('errorCookieBtn');

    // Preview Elements
    const previewCard = document.getElementById('previewCard');
    const mediaThumbnail = document.getElementById('mediaThumbnail');
    const mediaDuration = document.getElementById('mediaDuration');
    const previewPlatformTag = document.getElementById('previewPlatformTag');
    const mediaTitle = document.getElementById('mediaTitle');
    const mediaAuthor = document.getElementById('mediaAuthor');
    const mediaViews = document.getElementById('mediaViews');
    const mediaViewsContainer = document.getElementById('mediaViewsContainer');
    const tabVideo = document.getElementById('tabVideo');
    const tabAudio = document.getElementById('tabAudio');
    const videoQualityGroup = document.getElementById('videoQualityGroup');
    const audioQualityGroup = document.getElementById('audioQualityGroup');
    const qualityChips = document.getElementById('qualityChips');
    const startDownloadBtn = document.getElementById('startDownloadBtn');

    // Progress Elements
    const progressCard = document.getElementById('progressCard');
    const progressTitle = document.getElementById('progressTitle');
    const progressStatus = document.getElementById('progressStatus');
    const progressPercent = document.getElementById('progressPercent');
    const progressBarFill = document.getElementById('progressBarFill');
    const statSpeed = document.getElementById('statSpeed');
    const statSize = document.getElementById('statSize');
    const statEta = document.getElementById('statEta');

    // Success Elements
    const successCard = document.getElementById('successCard');
    const successFileName = document.getElementById('successFileName');
    const successFileSize = document.getElementById('successFileSize');
    const successFileFormat = document.getElementById('successFileFormat');
    const successOpenFolderBtn = document.getElementById('successOpenFolderBtn');
    const successPlayBtn = document.getElementById('successPlayBtn');
    const successSaveBrowserBtn = document.getElementById('successSaveBrowserBtn');
    const successDownloadAnotherBtn = document.getElementById('successDownloadAnotherBtn');

    // Library Elements
    const libraryGrid = document.getElementById('libraryGrid');
    const libraryCount = document.getElementById('libraryCount');
    const emptyLibrary = document.getElementById('emptyLibrary');
    const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
    const openFolderBtn = document.getElementById('openFolderBtn');

    // Modals
    const playerModal = document.getElementById('playerModal');
    const closePlayerModalBtn = document.getElementById('closePlayerModalBtn');
    const mediaPlayer = document.getElementById('mediaPlayer');
    const playerModalTitle = document.getElementById('playerModalTitle');

    const settingsModal = document.getElementById('settingsModal');
    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingDownloadDir = document.getElementById('settingDownloadDir');
    const openSettingsDirBtn = document.getElementById('openSettingsDirBtn');
    const resetSettingsDirBtn = document.getElementById('resetSettingsDirBtn');
    const settingDefaultQualitySelect = document.getElementById('settingDefaultQualitySelect');
    const settingNotificationsToggle = document.getElementById('settingNotificationsToggle');
    const settingAutoPasteToggle = document.getElementById('settingAutoPasteToggle');
    const settingBrowserCookieSelect = document.getElementById('settingBrowserCookieSelect');

    // Modals: Support, Privacy & Terms
    const supportModal = document.getElementById('supportModal');
    const footerSupportBtn = document.getElementById('footerSupportBtn');
    const closeSupportModalBtn = document.getElementById('closeSupportModalBtn');
    const supportForm = document.getElementById('supportForm');
    const submitSupportBtn = document.getElementById('submitSupportBtn');
    const supportContactEmail = document.getElementById('supportContactEmail');

    const privacyModal = document.getElementById('privacyModal');
    const footerPrivacyBtn = document.getElementById('footerPrivacyBtn');
    const closePrivacyModalBtn = document.getElementById('closePrivacyModalBtn');
    const closePrivacyBtn = document.getElementById('closePrivacyBtn');

    const termsModal = document.getElementById('termsModal');
    const footerTermsBtn = document.getElementById('footerTermsBtn');
    const closeTermsModalBtn = document.getElementById('closeTermsModalBtn');
    const closeTermsBtn = document.getElementById('closeTermsBtn');

    const toastContainer = document.getElementById('toastContainer');

    // Mobile Elements & Detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobileDevice) {
        document.body.classList.add('is-mobile');
        const saveLabel = document.getElementById('saveBtnLabel');
        if (saveLabel) saveLabel.textContent = "Save to Phone Storage";
    }

    const mobileModal = document.getElementById('mobileModal');
    const mobileConnectBtn = document.getElementById('mobileConnectBtn');
    const closeMobileModalBtn = document.getElementById('closeMobileModalBtn');
    const closeMobileBtn = document.getElementById('closeMobileBtn');
    const mobileQrImg = document.getElementById('mobileQrImg');
    const mobileUrlDisplay = document.getElementById('mobileUrlDisplay');
    const copyMobileUrlBtn = document.getElementById('copyMobileUrlBtn');

    // App State
    let currentMediaInfo = null;
    let selectedFormatType = "video";
    let selectedQuality = "best";
    let activeEventSource = null;
    let lastDownloadedFile = null;
    let appSettings = {
        download_dir: '',
        cookie_browser: null,
        default_quality: 'best',
        auto_paste: true,
        notifications: true,
        contact_email: 'satyabit7379@gmail.com'
    };
    let lastPastedUrl = '';

    // Toast Utility
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    // Platform Detection Logic
    function detectPlatform(url) {
        const u = url.toLowerCase();
        if (u.includes('instagram.com') || u.includes('instagr.am')) {
            return {
                name: 'Instagram (Reel/Story/Post)',
                icon: 'fa-brands fa-instagram',
                className: 'active-instagram'
            };
        } else if (u.includes('youtube.com') || u.includes('youtu.be')) {
            return {
                name: 'YouTube (Video/Shorts)',
                icon: 'fa-brands fa-youtube',
                className: 'active-youtube'
            };
        } else if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) {
            return {
                name: 'Facebook Video',
                icon: 'fa-brands fa-facebook',
                className: 'active-facebook'
            };
        } else if (u.includes('tiktok.com')) {
            return {
                name: 'TikTok Video',
                icon: 'fa-brands fa-tiktok',
                className: 'active-tiktok'
            };
        } else if (u.includes('twitter.com') || u.includes('x.com')) {
            return {
                name: 'X / Twitter Video',
                icon: 'fa-brands fa-x-twitter',
                className: 'active-twitter'
            };
        } else if (u.includes('reddit.com')) {
            return {
                name: 'Reddit Video',
                icon: 'fa-brands fa-reddit',
                className: 'active-reddit'
            };
        } else if (u.includes('twitch.tv')) {
            return {
                name: 'Twitch Clip',
                icon: 'fa-brands fa-twitch',
                className: 'active-twitch'
            };
        } else if (u.includes('pinterest.com') || u.includes('pin.it')) {
            return {
                name: 'Pinterest Video',
                icon: 'fa-brands fa-pinterest',
                className: 'active-pinterest'
            };
        } else if (u.trim().length > 6) {
            return {
                name: 'Direct Media Link',
                icon: 'fa-solid fa-link',
                className: 'active-generic'
            };
        }
        return {
            name: 'Auto Detect',
            icon: 'fa-solid fa-link',
            className: ''
        };
    }

    function updatePlatformIndicator(url) {
        const platform = detectPlatform(url);
        platformIndicator.className = 'platform-indicator ' + platform.className;
        platformIcon.className = platform.icon;
        platformName.textContent = platform.name;

        if (url.trim().length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    // Input Events
    videoUrlInput.addEventListener('input', (e) => {
        updatePlatformIndicator(e.target.value);
    });

    videoUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFetchInfo();
        }
    });

    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().startsWith('http')) {
                videoUrlInput.value = text.trim();
                updatePlatformIndicator(text.trim());
                showToast("Link pasted from clipboard!", "info");
                handleFetchInfo();
            } else {
                showToast("Clipboard does not contain a valid URL", "error");
            }
        } catch (err) {
            videoUrlInput.focus();
            if (isMobileDevice) {
                showToast("Please tap and hold input box to Paste link", "info");
            } else {
                showToast("Please press Ctrl+V to paste URL", "info");
            }
        }
    });

    // Auto-detect link on input focus
    videoUrlInput.addEventListener('focus', async () => {
        if (!videoUrlInput.value.trim() && appSettings.auto_paste && navigator.clipboard && navigator.clipboard.readText) {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().startsWith('http') && text.trim() !== lastPastedUrl) {
                    lastPastedUrl = text.trim();
                    videoUrlInput.value = text.trim();
                    updatePlatformIndicator(text.trim());
                    showToast("Link auto-detected from clipboard!", "info");
                }
            } catch (e) {
                // Clipboard read permission might be denied, ignore silently
            }
        }
    });

    clearBtn.addEventListener('click', () => {
        videoUrlInput.value = '';
        updatePlatformIndicator('');
        videoUrlInput.focus();
    });

    closeErrorBtn.addEventListener('click', () => {
        errorBanner.classList.add('hidden');
    });

    errorCookieBtn.addEventListener('click', () => {
        errorBanner.classList.add('hidden');
        openSettingsModal();
    });

    // Reset View
    function resetCards() {
        errorBanner.classList.add('hidden');
        previewCard.classList.add('hidden');
        progressCard.classList.add('hidden');
        successCard.classList.add('hidden');
        loadingState.classList.add('hidden');
    }

    // Fetch Media Info
    async function handleFetchInfo() {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showToast("Please paste a video link first", "error");
            videoUrlInput.focus();
            return;
        }

        resetCards();
        loadingState.classList.remove('hidden');
        loadingText.textContent = "Fetching video details & formats...";

        try {
            const res = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Failed to fetch video information");
            }

            currentMediaInfo = data;
            renderPreview(data);
        } catch (err) {
            console.error("Fetch error:", err);
            loadingState.classList.add('hidden');
            errorTitle.textContent = "Could Not Fetch Media";
            errorMessage.textContent = err.message;
            errorBanner.classList.remove('hidden');
        } finally {
            loadingState.classList.add('hidden');
        }
    }

    fetchInfoBtn.addEventListener('click', handleFetchInfo);

    // Fast Download (Direct without preview)
    quickDownloadBtn.addEventListener('click', () => {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showToast("Please paste a video link first", "error");
            videoUrlInput.focus();
            return;
        }
        startDownloadProcess(url, "video", "best");
    });

    // Render Preview
    function renderPreview(info) {
        mediaTitle.textContent = info.title || "Video";
        mediaAuthor.textContent = info.uploader || "Creator";
        
        if (info.view_count) {
            mediaViewsContainer.classList.remove('hidden');
            mediaViews.textContent = Number(info.view_count).toLocaleString();
        } else {
            mediaViewsContainer.classList.add('hidden');
        }

        if (info.thumbnail) {
            mediaThumbnail.src = info.thumbnail;
        } else {
            mediaThumbnail.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80";
        }

        mediaDuration.textContent = info.duration_str || "HD";

        // Platform icon in preview
        const detected = detectPlatform(info.url);
        previewPlatformTag.innerHTML = `<i class="${detected.icon}"></i>`;

        // Render Quality Chips
        qualityChips.innerHTML = '';
        selectedQuality = "best";

        const resolutions = info.resolutions && info.resolutions.length > 0 
            ? info.resolutions 
            : ['Best Quality (Auto)'];

        resolutions.forEach((res, index) => {
            const btn = document.createElement('button');
            btn.className = `quality-chip ${index === 0 ? 'active' : ''}`;
            btn.textContent = res;
            
            // Map label to quality parameter
            let qualityKey = 'best';
            if (res.includes('1080p')) qualityKey = '1080p';
            else if (res.includes('720p')) qualityKey = '720p';
            else if (res.includes('480p')) qualityKey = '480p';
            else if (res.includes('360p')) qualityKey = '360p';
            else if (res.includes('4K')) qualityKey = '4K';

            btn.dataset.quality = qualityKey;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.quality-chip').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                selectedQuality = qualityKey;
            });

            qualityChips.appendChild(btn);
        });

        // Reset format tabs
        selectedFormatType = "video";
        tabVideo.classList.add('active');
        tabAudio.classList.remove('active');
        videoQualityGroup.classList.remove('hidden');
        audioQualityGroup.classList.add('hidden');

        previewCard.classList.remove('hidden');
        previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Format Tabs Toggle
    tabVideo.addEventListener('click', () => {
        selectedFormatType = "video";
        tabVideo.classList.add('active');
        tabAudio.classList.remove('active');
        videoQualityGroup.classList.remove('hidden');
        audioQualityGroup.classList.add('hidden');
    });

    tabAudio.addEventListener('click', () => {
        selectedFormatType = "audio";
        tabAudio.classList.add('active');
        tabVideo.classList.remove('active');
        videoQualityGroup.classList.add('hidden');
        audioQualityGroup.classList.remove('hidden');
    });

    // Start Download from Preview Card
    startDownloadBtn.addEventListener('click', () => {
        if (!currentMediaInfo) return;
        startDownloadProcess(currentMediaInfo.url, selectedFormatType, selectedQuality);
    });

    // Core Download Execution & Progress Stream
    async function startDownloadProcess(url, formatType, quality) {
        resetCards();
        progressCard.classList.remove('hidden');
        progressTitle.textContent = "Connecting to media stream...";
        progressStatus.textContent = "Preparing downloader and audio/video encoders...";
        progressBarFill.style.width = '0%';
        progressPercent.textContent = '0%';
        statSpeed.textContent = '-- MB/s';
        statSize.textContent = '-- / --';
        statEta.textContent = '--';

        try {
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    format_type: formatType,
                    quality: quality
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Download failed to initialize");
            }

            const taskId = data.task_id;
            listenToProgress(taskId);
        } catch (err) {
            console.error(err);
            progressCard.classList.add('hidden');
            errorTitle.textContent = "Download Error";
            errorMessage.textContent = err.message;
            errorBanner.classList.remove('hidden');
        }
    }

    function listenToProgress(taskId) {
        if (activeEventSource) {
            activeEventSource.close();
        }

        activeEventSource = new EventSource(`/api/progress/${taskId}`);

        activeEventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleProgressUpdate(data);
            } catch (e) {
                console.error("SSE parse error", e);
            }
        };

        activeEventSource.onerror = (err) => {
            console.warn("EventSource disconnected or closed", err);
            // Fallback poll once
            fetch(`/api/task/${taskId}`)
                .then(r => r.json())
                .then(data => handleProgressUpdate(data))
                .catch(() => {});
        };
    }

    function handleProgressUpdate(data) {
        if (!data) return;

        if (data.status === 'downloading') {
            const pct = Math.min(Math.round(data.percentage || 0), 99);
            progressBarFill.style.width = `${pct}%`;
            progressPercent.textContent = `${pct}%`;
            progressTitle.textContent = data.title || "Downloading Video...";
            progressStatus.textContent = "Transferring high-definition media streams...";
            statSpeed.textContent = data.speed_str || '-- MB/s';
            statSize.textContent = `${data.downloaded_str || '0 MB'} / ${data.total_str || 'Unknown'}`;
            statEta.textContent = data.eta_str || 'Calculating...';
        } else if (data.status === 'processing') {
            progressBarFill.style.width = '99%';
            progressPercent.textContent = '99%';
            progressTitle.textContent = "Merging & Converting...";
            progressStatus.textContent = "FFmpeg is combining video and audio for highest quality...";
            statSpeed.textContent = 'Merging';
            statEta.textContent = 'A few seconds...';
        } else if (data.status === 'completed') {
            if (activeEventSource) {
                activeEventSource.close();
                activeEventSource = null;
            }
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';
            
            setTimeout(() => {
                showDownloadSuccess(data);
            }, 600);
        } else if (data.status === 'error') {
            if (activeEventSource) {
                activeEventSource.close();
                activeEventSource = null;
            }
            progressCard.classList.add('hidden');
            errorTitle.textContent = "Download Error";
            errorMessage.textContent = data.error || "An error occurred during download.";
            errorBanner.classList.remove('hidden');
            showToast("Download failed", "error");
        }
    }

    function showDownloadSuccess(data) {
        lastDownloadedFile = data.filename;
        progressCard.classList.add('hidden');
        successCard.classList.remove('hidden');

        successFileName.textContent = data.filename;
        successFileSize.textContent = data.file_size_str || 'Downloaded';
        successFileFormat.textContent = data.format_type === 'audio' ? 'MP3 Audio (320kbps)' : 'MP4 Video (HD)';

        showToast("Download Completed Successfully! 🎉", "success");
        loadLibrary();

        // Background Desktop Notification
        if (appSettings.notifications && ("Notification" in window) && Notification.permission === "granted") {
            try {
                const notif = new Notification("URL Video Download: Download Complete! 🎉", {
                    body: `${data.filename} (${data.file_size_str || 'Saved'})\nClick to view file`,
                    icon: "/static/assets/logo.png"
                });
                notif.onclick = () => {
                    window.focus();
                    openDownloadsFolder(data.filename);
                };
            } catch (e) {
                console.warn("Notification error:", e);
            }
        }
    }

    // Success Card Button Handlers
    successOpenFolderBtn.addEventListener('click', () => {
        openDownloadsFolder(lastDownloadedFile);
    });

    successPlayBtn.addEventListener('click', () => {
        if (lastDownloadedFile) {
            playMediaInModal(lastDownloadedFile);
        }
    });

    successSaveBrowserBtn.addEventListener('click', () => {
        if (lastDownloadedFile) {
            window.location.href = `/api/download-file/${encodeURIComponent(lastDownloadedFile)}`;
        }
    });

    successDownloadAnotherBtn.addEventListener('click', () => {
        resetCards();
        videoUrlInput.value = '';
        updatePlatformIndicator('');
        videoUrlInput.focus();
    });

    // Library Management
    async function loadLibrary() {
        try {
            const res = await fetch('/api/downloads');
            const data = await res.json();
            renderLibrary(data.files);
        } catch (err) {
            console.error("Library load error:", err);
        }
    }

    function renderLibrary(files) {
        libraryCount.textContent = `${files.length} Files`;

        if (!files || files.length === 0) {
            emptyLibrary.classList.remove('hidden');
            libraryGrid.innerHTML = '';
            libraryGrid.appendChild(emptyLibrary);
            return;
        }

        emptyLibrary.classList.add('hidden');
        libraryGrid.innerHTML = '';

        files.forEach(file => {
            const row = document.createElement('div');
            row.className = 'media-item-row';

            const isAudio = file.type === 'audio';
            const iconClass = isAudio ? 'fa-music' : 'fa-video';
            const badgeClass = isAudio ? 'badge-audio' : 'badge-video';

            row.innerHTML = `
                <div class="media-item-info">
                    <div class="media-type-badge ${badgeClass}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="media-details">
                        <div class="media-name" title="${file.filename}">${file.filename}</div>
                        <div class="media-meta-sub">
                            <span><i class="fa-regular fa-hard-drive"></i> ${file.size_str}</span>
                            <span>•</span>
                            <span><i class="fa-regular fa-clock"></i> ${file.date_str}</span>
                        </div>
                    </div>
                </div>
                <div class="media-item-actions">
                    <button class="icon-btn play-item-btn" title="Play Media">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="icon-btn folder-item-btn" title="Show in Folder">
                        <i class="fa-regular fa-folder-open"></i>
                    </button>
                    <button class="icon-btn default-player-btn" title="Open with Windows Player">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button class="icon-btn download-browser-btn" title="Save to Browser">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button class="icon-btn delete-btn delete-item-btn" title="Delete File">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Action bindings
            row.querySelector('.play-item-btn').addEventListener('click', () => {
                playMediaInModal(file.filename);
            });

            row.querySelector('.folder-item-btn').addEventListener('click', () => {
                openDownloadsFolder(file.filename);
            });

            row.querySelector('.default-player-btn').addEventListener('click', () => {
                openFileWithPlayer(file.filename);
            });

            row.querySelector('.download-browser-btn').addEventListener('click', () => {
                window.location.href = `/api/download-file/${encodeURIComponent(file.filename)}`;
            });

            row.querySelector('.delete-item-btn').addEventListener('click', () => {
                if (confirm(`Delete "${file.filename}"?`)) {
                    deleteFile(file.filename);
                }
            });

            libraryGrid.appendChild(row);
        });
    }

    refreshLibraryBtn.addEventListener('click', () => {
        loadLibrary();
        showToast("Library refreshed", "info");
    });

    // File Actions
    async function openDownloadsFolder(filename = null) {
        try {
            await fetch('/api/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (isMobileDevice) {
                showToast("Opened on computer. On phone, use 'Save to Phone' button.", "info");
            } else {
                showToast("Opened Downloads folder in Explorer", "info");
            }
        } catch (e) {
            showToast("Failed to open folder", "error");
        }
    }

    async function openFileWithPlayer(filename) {
        try {
            await fetch('/api/open-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            showToast("Launched media player", "info");
        } catch (e) {
            showToast("Failed to launch player", "error");
        }
    }

    async function deleteFile(filename) {
        try {
            const res = await fetch(`/api/downloads/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast("File deleted", "info");
                loadLibrary();
            } else {
                showToast("Could not delete file", "error");
            }
        } catch (e) {
            showToast("Delete failed", "error");
        }
    }

    openFolderBtn.addEventListener('click', () => {
        openDownloadsFolder();
    });

    // In-App Video Modal Player
    function playMediaInModal(filename) {
        playerModalTitle.textContent = filename;
        mediaPlayer.src = `/api/stream/${encodeURIComponent(filename)}`;
        playerModal.classList.remove('hidden');
        mediaPlayer.play().catch(() => {});
    }

    function closePlayerModal() {
        mediaPlayer.pause();
        mediaPlayer.src = '';
        playerModal.classList.add('hidden');
    }

    closePlayerModalBtn.addEventListener('click', closePlayerModal);
    playerModal.addEventListener('click', (e) => {
        if (e.target === playerModal) closePlayerModal();
    });

    // Settings Modal
    async function openSettingsModal() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            appSettings = { ...appSettings, ...data };

            settingDownloadDir.value = data.download_dir || '';
            settingBrowserCookieSelect.value = data.cookie_browser || 'none';
            settingDefaultQualitySelect.value = data.default_quality || 'best';
            settingNotificationsToggle.checked = data.notifications !== false;
            settingAutoPasteToggle.checked = data.auto_paste !== false;
        } catch (e) {
            console.error("Settings load error:", e);
        }
        settingsModal.classList.remove('hidden');
    }

    function closeSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    settingsToggleBtn.addEventListener('click', openSettingsModal);
    closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });

    openSettingsDirBtn.addEventListener('click', () => {
        openDownloadsFolder();
    });

    resetSettingsDirBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/reset-download-dir', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                settingDownloadDir.value = data.download_dir;
                appSettings.download_dir = data.download_dir;
                showToast("Folder reset to default downloads directory!", "info");
            }
        } catch (e) {
            showToast("Failed to reset directory", "error");
        }
    });

    saveSettingsBtn.addEventListener('click', async () => {
        const downloadDir = settingDownloadDir.value.trim();
        const cookieBrowser = settingBrowserCookieSelect.value;
        const defaultQuality = settingDefaultQualitySelect.value;
        const notifications = settingNotificationsToggle.checked;
        const autoPaste = settingAutoPasteToggle.checked;

        // Request notification permission if enabled
        if (notifications && "Notification" in window && Notification.permission === "default") {
            try {
                await Notification.requestPermission();
            } catch (e) {}
        }

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    download_dir: downloadDir,
                    cookie_browser: cookieBrowser,
                    default_quality: defaultQuality,
                    notifications: notifications,
                    auto_paste: autoPaste
                })
            });

            if (res.ok) {
                const updated = await res.json();
                appSettings = { ...appSettings, ...updated };
                showToast("Settings saved successfully! ⚙️", "success");
                closeSettingsModal();
            } else {
                showToast("Failed to save settings", "error");
            }
        } catch (e) {
            showToast("Settings update error", "error");
        }
    });

    // Support Us & Contact Modal
    function openSupportModal(presetCategory = null, presetUrl = null) {
        if (presetCategory) document.getElementById('supportCategory').value = presetCategory;
        if (presetUrl) document.getElementById('supportUrl').value = presetUrl;
        supportModal.classList.remove('hidden');
    }

    function closeSupportModal() {
        supportModal.classList.add('hidden');
    }

    footerSupportBtn.addEventListener('click', () => openSupportModal());
    closeSupportModalBtn.addEventListener('click', closeSupportModal);
    supportModal.addEventListener('click', (e) => {
        if (e.target === supportModal) closeSupportModal();
    });

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('supportName').value.trim();
        const email = document.getElementById('supportEmail').value.trim();
        const category = document.getElementById('supportCategory').value;
        const platform = document.getElementById('supportPlatform').value;
        const videoUrl = document.getElementById('supportUrl').value.trim();
        const message = document.getElementById('supportMessage').value.trim();

        if (!name || !email || !message) {
            showToast("Please fill in Name, Email and Message.", "error");
            return;
        }

        const originalBtnText = submitSupportBtn.innerHTML;
        submitSupportBtn.disabled = true;
        submitSupportBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;

        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    category,
                    platform,
                    video_url: videoUrl,
                    message
                })
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`Ticket Created: ${data.ticket_id}! Opening Gmail to send message to satyabit7379@gmail.com...`, "success");
                
                // Construct prefilled Gmail Compose URL
                const subject = encodeURIComponent(`[URL Video Download Support] ${category.toUpperCase()} - #${data.ticket_id}`);
                const body = encodeURIComponent(`Hello Satyabit,\n\nI am requesting support regarding the URL Video Download application:\n\n- Name: ${name}\n- Sender Email: ${email}\n- Category: ${category}\n- Platform: ${platform}\n- Video Link: ${videoUrl || 'N/A'}\n\nDescription:\n${message}\n\nTicket Reference: ${data.ticket_id}\nApplication: URL Video Download`);
                const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=satyabit7379@gmail.com&su=${subject}&body=${body}`;
                
                // Open Gmail compose directly in new tab
                window.open(gmailComposeUrl, '_blank');

                supportForm.reset();
                setTimeout(() => {
                    closeSupportModal();
                }, 1200);
            } else {
                showToast(data.detail || "Could not submit support ticket", "error");
            }
        } catch (err) {
            console.error("Support submit error:", err);
            showToast("Failed to send message. Please check internet connection.", "error");
        } finally {
            submitSupportBtn.disabled = false;
            submitSupportBtn.innerHTML = originalBtnText;
        }
    });

    // Privacy Policy Modal
    footerPrivacyBtn.addEventListener('click', () => privacyModal.classList.remove('hidden'));
    closePrivacyModalBtn.addEventListener('click', () => privacyModal.classList.add('hidden'));
    closePrivacyBtn.addEventListener('click', () => privacyModal.classList.add('hidden'));
    privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) privacyModal.classList.add('hidden');
    });

    // Terms of Service Modal
    footerTermsBtn.addEventListener('click', () => termsModal.classList.remove('hidden'));
    closeTermsModalBtn.addEventListener('click', () => termsModal.classList.add('hidden'));
    closeTermsBtn.addEventListener('click', () => termsModal.classList.add('hidden'));
    termsModal.addEventListener('click', (e) => {
        if (e.target === termsModal) termsModal.classList.add('hidden');
    });

    // Mobile Connect Modal
    async function openMobileConnectModal() {
        try {
            const res = await fetch('/api/network-info');
            const data = await res.json();
            if (data.mobile_url) {
                mobileUrlDisplay.value = data.mobile_url;
                mobileQrImg.src = data.qr_url;
            }
        } catch (e) {
            console.warn("Could not fetch network info:", e);
            mobileUrlDisplay.value = window.location.origin;
            mobileQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}`;
        }
        mobileModal.classList.remove('hidden');
    }

    if (mobileConnectBtn) mobileConnectBtn.addEventListener('click', openMobileConnectModal);
    if (closeMobileModalBtn) closeMobileModalBtn.addEventListener('click', () => mobileModal.classList.add('hidden'));
    if (closeMobileBtn) closeMobileBtn.addEventListener('click', () => mobileModal.classList.add('hidden'));
    if (mobileModal) {
        mobileModal.addEventListener('click', (e) => {
            if (e.target === mobileModal) mobileModal.classList.add('hidden');
        });
    }

    if (copyMobileUrlBtn) {
        copyMobileUrlBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(mobileUrlDisplay.value);
                showToast("Mobile link copied to clipboard! 📋", "success");
            } catch (err) {
                mobileUrlDisplay.select();
                showToast("Please copy the link manually", "info");
            }
        });
    }

    // Initial Load: Fetch Settings & Library
    async function initApp() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            appSettings = { ...appSettings, ...data };
            if (appSettings.notifications && "Notification" in window && Notification.permission === "default") {
                // Request once nicely
                Notification.requestPermission();
            }
        } catch (e) {
            console.warn("Could not load initial settings:", e);
        }
        loadLibrary();
    }

    initApp();
});
