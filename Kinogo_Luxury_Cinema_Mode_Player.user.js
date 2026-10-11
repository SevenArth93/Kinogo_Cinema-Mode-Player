// ==UserScript==
// @name         Kinogo Luxury Cinema Mode Player v15.6.14
// @namespace    http://tampermonkey.net
// @version      15.6.14
// @description  Cinema Mode + Вертикальный свернутый плеер + Обновление из облака
// @author       SevenArth/G
// @match        http://*.kinogo.luxury/*
// @match        https://*.kinogo.luxury/*
// @match        http://*.kinogo.ec/*
// @match        https://*.kinogo.ec/*
// @match        http://*.kinogo.pro/*
// @match        https://*.kinogo.pro/*
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// @updateURL    https://cloud.mail.ru/public/h2rw/VnuTJWSz3
// @downloadURL  https://cloud.mail.ru/public/h2rw/VnuTJWSz3
// ==/UserScript==

(function() {
    'use strict';

    // 1. КОНТЕКСТ ФРЕЙМА ПЛЕЕРА (Внутри Alloha/CDN)
    if (window.self !== window.top) {
        let frameAttempts = 0;

        const frameInterval = setInterval(() => {
            frameAttempts++;
            if (frameAttempts > 80) { clearInterval(frameInterval); return; }

            let startAllowed = true;
            try {
                if (window.name && window.name.indexOf('kg_start=0') !== -1) {
                    startAllowed = false;
                }
            } catch(e) { startAllowed = true; }

            if (!startAllowed) {
                clearInterval(frameInterval);
                const video = document.querySelector('video');
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                    video.muted = true;
                }
                return;
            }

            const btnContinue = document.querySelector('.button-continue, .continue-btn, [class*="continue"]');
            if (btnContinue && typeof btnContinue.click === 'function') {
                btnContinue.click();
                clearInterval(frameInterval);
                return;
            }

            let btnPlay = null;
            const pjsElements = document.querySelectorAll('pjsdiv');
            for (let i = 0; i < pjsElements.length; i++) {
                const styleAttr = pjsElements[i].getAttribute('style') || '';
                if (styleAttr.indexOf('scale') !== -1 || styleAttr.indexOf('cursor: pointer') !== -1) {
                    btnPlay = pjsElements[i];
                    break;
                }
            }

            if (!btnPlay) {
                btnPlay = document.querySelector('.pjs-play-btn, [class*="play-btn"], .yohoho-play, .vp-play');
            }

            if (btnPlay) {
                try {
                    btnPlay.focus();

                    const rect = btnPlay.getBoundingClientRect();
                    const targetX = rect.left + (rect.width / 2);
                    const targetY = rect.top + (rect.height / 2);

                    const mousedown = new MouseEvent('mousedown', { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true, view: window });
                    const mouseup = new MouseEvent('mouseup', { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true, view: window });
                    const click = new MouseEvent('click', { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true, view: window, detail: 1 });

                    btnPlay.dispatchEvent(mousedown);
                    btnPlay.dispatchEvent(mouseup);
                    btnPlay.dispatchEvent(click);

                    if (typeof btnPlay.click === 'function') btnPlay.click();

                    const videoTag = document.querySelector('video');
                    if (videoTag) {
                        videoTag.muted = false;
                        videoTag.play().catch(() => {});
                    }

                    clearInterval(frameInterval);
                } catch(e) {
                    if (typeof btnPlay.click === 'function') btnPlay.click();
                    clearInterval(frameInterval);
                }
            }
        }, 300);
        return;
    }

    // 2. КОНТЕКСТ ГЛАВНОГО ОКНА KINOGO
    let autoStartEnabled = localStorage.getItem('kg_autostart') !== 'false';

    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.apply(this, arguments);
        if (tagName.toLowerCase() === 'iframe') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && value && value.indexOf('kg_start=') === -1) {
                    const separator = value.indexOf('?') !== -1 ? '&' : '?';
                    value = value + separator + 'kg_start=' + (autoStartEnabled ? '1' : '0');
                }
                originalSetAttribute.apply(this, [name, value]);
            };
        }
        return element;
    };

    let isCollapsed = false;
    let hideTimeout;

    // СТИЛИ: Изменены пропорции для вертикального свернутого состояния (30px на 130px)
    const css = `
        .video-container.kg-video-container,
        div.video-container {
            position: fixed !important;
            top: 0px !important;
            left: 0px !important;
            z-index: 999999999 !important;
            background: #000 !important;
            box-shadow: 0 0 35px rgba(0,0,0,0.9) !important;
            border-right: 1px solid #333333 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            width: 100% !important;
            aspect-ratio: 16 / 9 !important;
            height: 92% !important;
            transition: width 0.2s, height 0.2s !important;
            border-bottom: none !important;
        }

        /* ИСПРАВЛЕНО: Ширина и высота свернутого состояния поменялись местами */
        .video-container.kg-video-container.kg-collapsed-state {
            width: 30px !important;
            height: 130px !important;
            aspect-ratio: auto !important;
            cursor: pointer !important;
            border-bottom: 1px solid #333333 !important;
        }

        .video-container.kg-video-container iframe,
        div.video-container iframe {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
        }

        .video-container.kg-video-container.kg-collapsed-state iframe {
            pointer-events: none !important;
            visibility: hidden !important;
        }

        .video-container.kg-video-container button:not(.custom-toggle-btn):not(.kg-lclick-close-btn):not(.kg-autostart-btn) {
            display: none !important;
        }

        .custom-toggle-btn {
            position: absolute !important;
            top: 4px !important;
            left: 4px !important;
            background: rgba(30, 30, 30, 0.6) !important;
            color: #888888 !important;
            border: 1px solid #333333 !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 10px !important;
            font-weight: bold !important;
            padding: 1px 6px !important;
            cursor: pointer !important;
            border-radius: 2px !important;
            z-index: 1000000000 !important;
            display: block !important;
            transition: opacity 0.2s ease-in-out !important;
        }
        .custom-toggle-btn:hover {
            background: rgba(50, 50, 50, 0.9) !important;
            color: #ffffff !important;
            border-color: #555555 !important;
        }
        .kg-collapsed-state .custom-toggle-btn { display: none !important; }

        .kg-hide-controls { cursor: none !important; }
        .kg-hide-controls .custom-toggle-btn { opacity: 0 !important; }

        .kg-lclick-close-btn {
            position: absolute !important;
            bottom: -1px !important;
            left: 0px !important;
            width: 95% !important;
            height: 1px !important;
            background: #333333 !important;
            border: none !important;
            cursor: pointer !important;
            z-index: 1000000010 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            transition: height 0.15s ease-in-out, bottom 0.15s ease-in-out, opacity 0.2s !important;
            opacity: 0.8 !important;
        }

        .kg-autostart-btn {
            position: absolute !important;
            bottom: -2px !important;
            right: 0px !important;
            width: 5% !important;
            height: 2px !important;
            box-sizing: border-box !important;
            border: none !important;
            cursor: pointer !important;
            z-index: 1000000010 !important;
            padding: 0 !important;
            margin: 0 !important;
            transition: height 0.15s ease-in-out, bottom 0.15s ease-in-out, opacity 0.2s !important;
            opacity: 0.8 !important;
        }
        .kg-autostart-btn.active { background: #2ecc71 !important; }
        .kg-autostart-btn.inactive { background: #e74c3c !important; }

        .kg-edge-hover .kg-lclick-close-btn {
            height: 15px !important;
            bottom: -15px !important;
            background: rgba(51, 51, 51, 0.6) !important;
        }
        .kg-edge-hover .kg-autostart-btn {
            height: 15px !important;
            bottom: -15px !important;
            opacity: 1 !important;
        }
        .kg-edge-hover .kg-autostart-btn.active { background: rgba(46, 204, 113, 0.6) !important; }
        .kg-edge-hover .kg-autostart-btn.inactive { background: rgba(231, 76, 60, 0.6) !important; }
.kg-lclick-close-btn:hover { opacity: 1 !important; background: rgba(70, 70, 70, 0.8) !important; }
.kg-collapsed-state .kg-lclick-close-btn,
.kg-collapsed-state .kg-autostart-btn { display: none !important; }
.kg-hide-controls .kg-lclick-close-btn,
.kg-hide-controls .kg-autostart-btn { opacity: 0 !important; pointer-events: none !important; }
.kg-cinema-overlay {
position: fixed !important;
top: 0 !important;
left: 0 !important;
width: 100vw !important;
height: 100vh !important;
background: rgba(0, 0, 0, 0.75) !important;
z-index: 999999998 !important;
pointer-events: none !important;
transition: opacity 0.2s ease-in-out !important;
opacity: 1 !important;
}
.kg-overlay-hidden { opacity: 0 !important; visibility: hidden !important; }
`;
if (typeof GM_addStyle !== 'undefined') {
GM_addStyle(css);
} else {
const style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = css;
document.head.appendChild(style);
}
const createOverlay = () => {
if (!document.querySelector('.kg-cinema-overlay')) {
const overlay = document.createElement('div');
overlay.className = 'kg-cinema-overlay';
document.body.appendChild(overlay);
}
};
const togglePlayer = () => {
const player = document.querySelector('.video-container.kg-video-container');
const overlay = document.querySelector('.kg-cinema-overlay');
if (player) {
isCollapsed = !isCollapsed;
if (isCollapsed) {
player.classList.add('kg-collapsed-state');
player.classList.remove('kg-hide-controls', 'kg-edge-hover');
if (overlay) overlay.classList.add('kg-overlay-hidden');
} else {
player.classList.remove('kg-collapsed-state');
if (overlay) overlay.classList.remove('kg-overlay-hidden');
resetHideTimer();
}
}
};
const showControls = () => {
const player = document.querySelector('.video-container.kg-video-container');
if (player && !isCollapsed) {
player.classList.remove('kg-hide-controls');
}
};
const hideControls = () => {
const player = document.querySelector('.video-container.kg-video-container');
if (player && !isCollapsed) {
player.classList.add('kg-hide-controls');
}
};
const resetHideTimer = () => {
showControls();
clearTimeout(hideTimeout);
if (!isCollapsed) {
hideTimeout = setTimeout(hideControls, 2000);
}
};
const handleEdgeDetection = (e) => {
const player = document.querySelector('.video-container.kg-video-container');
if (!player || isCollapsed) return;
const rect = player.getBoundingClientRect();
const mouseY = e.clientY;
const playerBottom = rect.bottom;
if (mouseY >= (playerBottom - 5) && mouseY <= (playerBottom + 25)) {
player.classList.add('kg-edge-hover');
showControls();
clearTimeout(hideTimeout);
} else {
player.classList.remove('kg-edge-hover');
resetHideTimer();
}
};
const syncStatusToIframe = (iframe) => {
if (!iframe || iframe.dataset.kgFixed) return;
iframe.dataset.kgFixed = "true";
try {
if (iframe.contentWindow) {
iframe.contentWindow.name = autoStartEnabled ? 'kg_start=1' : 'kg_start=0';
}
} catch(e) {}
if (iframe.src && iframe.src.indexOf('kg_start=') === -1) {
const separator = iframe.src.indexOf('?') !== -1 ? '&' : '?';
iframe.src = iframe.src + separator + 'kg_start=' + (autoStartEnabled ? '1' : '0');
}
};
const safeInitPlayer = () => {
if (!/kinogo.(luxury|ec|pro)/.test(window.location.hostname)) return;
const playerContainer = document.querySelector('.video-container.kg-video-container');
const overlay = document.querySelector('.kg-cinema-overlay');
if (!playerContainer) {
if (overlay) overlay.remove();
return;
}
createOverlay();
if (playerContainer.parentElement !== document.body) {
document.body.appendChild(playerContainer);
}
window.focus();
const iframe = playerContainer.querySelector('iframe');
if (iframe) {
syncStatusToIframe(iframe);
}
if (!playerContainer.dataset.rmbBound) {
playerContainer.addEventListener('click', (e) => {
if (isCollapsed) {
e.preventDefault(); e.stopPropagation();
togglePlayer();
}
});
playerContainer.addEventListener('contextmenu', (e) => {
if (isCollapsed) {
e.preventDefault(); e.stopPropagation();
togglePlayer();
} else {
if (!e.target.classList.contains('custom-toggle-btn') &&
!e.target.classList.contains('kg-autostart-btn') &&
!e.target.classList.contains('kg-lclick-close-btn')) {
e.preventDefault(); e.stopPropagation();
togglePlayer();
}
}
});
playerContainer.addEventListener('mousemove', (e) => {
resetHideTimer();
handleEdgeDetection(e);
});
playerContainer.addEventListener('mouseenter', resetHideTimer);
playerContainer.addEventListener('mouseleave', () => {
const player = document.querySelector('.video-container.kg-video-container');
if (player) player.classList.remove('kg-edge-hover');
hideControls();
});
document.addEventListener('mousemove', handleEdgeDetection);
playerContainer.dataset.rmbBound = "true";
resetHideTimer();
}
if (!document.querySelector('.custom-toggle-btn')) {
const toggleBtn = document.createElement('button');
toggleBtn.className = 'custom-toggle-btn';
toggleBtn.innerText = '-';
toggleBtn.addEventListener('click', (e) => {
e.preventDefault(); e.stopPropagation();
togglePlayer();
});
playerContainer.appendChild(toggleBtn);
}
if (!document.querySelector('.kg-lclick-close-btn')) {
const lclickBtn = document.createElement('button');
lclickBtn.className = 'kg-lclick-close-btn';
lclickBtn.title = 'Нажмите ЛКМ, чтобы свернуть плеер';
lclickBtn.addEventListener('click', (e) => {
e.preventDefault(); e.stopPropagation();
togglePlayer();
});
lclickBtn.addEventListener('contextmenu', (e) => {
e.preventDefault(); e.stopPropagation();
});
playerContainer.appendChild(lclickBtn);
}
if (!document.querySelector('.kg-autostart-btn')) {
const startBtn = document.createElement('button');
startBtn.className = 'kg-autostart-btn ' + (autoStartEnabled ? 'active' : 'inactive');
startBtn.title = 'Автостарт: ' + (autoStartEnabled ? 'ВКЛ' : 'ВЫКЛ');
startBtn.addEventListener('click', (e) => {
e.preventDefault(); e.stopPropagation();
autoStartEnabled = !autoStartEnabled;
localStorage.setItem('kg_autostart', autoStartEnabled);
startBtn.className = 'kg-autostart-btn ' + (autoStartEnabled ? 'active' : 'inactive');
startBtn.title = 'Автостарт: ' + (autoStartEnabled ? 'ВКЛ' : 'ВЫКЛ');
const activeIframe = document.querySelector('.video-container.kg-video-container iframe');
if (activeIframe) {
activeIframe.removeAttribute('data-kg-fixed');
syncStatusToIframe(activeIframe);
}
});
playerContainer.appendChild(startBtn);
}
};
window.addEventListener('keydown', (e) => {
if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
return;
}
if (e.code === 'KeyQ') {
togglePlayer();
}
}, true);
const observer = new MutationObserver(safeInitPlayer);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', safeInitPlayer);
window.addEventListener('load', safeInitPlayer);
})();
