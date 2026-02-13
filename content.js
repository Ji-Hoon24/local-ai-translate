(function () {
  'use strict';

  if (window.__localAiTranslateLoaded) return;
  window.__localAiTranslateLoaded = true;

  const HOST_ID = 'local-ai-translate-host';

  let hostEl = document.getElementById(HOST_ID);
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    document.body.appendChild(hostEl);
  }

  const shadow = hostEl.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    .translate-icon {
      position: fixed;
      width: 32px;
      height: 32px;
      background: #4A90D9;
      border-radius: 8px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 2147483647;
      transition: transform 0.1s;
      pointer-events: auto;
    }
    .translate-icon:hover {
      transform: scale(1.1);
      background: #357ABD;
    }
    .translate-icon svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .translate-popup {
      position: fixed;
      min-width: 340px;
      max-width: 520px;
      max-height: 70vh;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      pointer-events: auto;
      transition: width 0.15s ease;
    }

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #4A90D9;
      color: white;
      font-size: 13px;
      font-weight: 600;
    }
    .popup-header .lang-badge {
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 400;
    }
    .popup-close {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 2px;
    }
    .popup-close:hover { opacity: 0.7; }

    .popup-source {
      padding: 10px 14px;
      background: #f7f8fa;
      border-bottom: 1px solid #e8e8e8;
      font-size: 13px;
      color: #666;
      max-height: 120px;
      overflow-y: auto;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .popup-result {
      padding: 14px;
      flex: 1;
      overflow-y: auto;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 40px;
    }

    .popup-result.loading {
      color: #999;
    }

    .popup-result.error {
      color: #d32f2f;
    }

    .popup-footer {
      display: flex;
      justify-content: flex-end;
      padding: 8px 14px;
      border-top: 1px solid #e8e8e8;
      gap: 8px;
    }
    .popup-btn {
      padding: 5px 14px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 12px;
      color: #555;
      transition: background 0.15s;
    }
    .popup-btn:hover {
      background: #f0f0f0;
    }
    .popup-btn.copied {
      background: #4A90D9;
      color: white;
      border-color: #4A90D9;
    }
  `;
  shadow.appendChild(style);

  // Translate icon
  const icon = document.createElement('div');
  icon.className = 'translate-icon';
  icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`;
  shadow.appendChild(icon);

  // Popup
  const popup = document.createElement('div');
  popup.className = 'translate-popup';
  popup.innerHTML = `
    <div class="popup-header">
      <span>Local AI Translate</span>
      <span class="lang-badge" style="display:none"></span>
      <button class="popup-close">&times;</button>
    </div>
    <div class="popup-source"></div>
    <div class="popup-result loading">Translating...</div>
    <div class="popup-footer">
      <button class="popup-btn copy-btn">Copy</button>
    </div>
  `;
  shadow.appendChild(popup);

  const langBadge = popup.querySelector('.lang-badge');
  const sourceDiv = popup.querySelector('.popup-source');
  const resultDiv = popup.querySelector('.popup-result');
  const closeBtn = popup.querySelector('.popup-close');
  const copyBtn = popup.querySelector('.copy-btn');

  let currentPort = null;
  let fullResult = '';

  function hideIcon() {
    icon.style.display = 'none';
  }

  function hidePopup() {
    popup.style.display = 'none';
    langBadge.style.display = 'none';
    if (currentPort) {
      currentPort.disconnect();
      currentPort = null;
    }
  }

  function hideAll() {
    hideIcon();
    hidePopup();
  }

  function positionElement(el, x, y, elWidth, elHeight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (left + elWidth > vw - 10) left = vw - elWidth - 10;
    if (left < 10) left = 10;
    if (top + elHeight > vh - 10) top = vh - elHeight - 10;
    if (top < 10) top = 10;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function showIcon(x, y) {
    icon.style.display = 'flex';
    positionElement(icon, x, y, 32, 32);
  }

  function calcPopupWidth(textLen) {
    if (textLen < 80) return 340;
    if (textLen < 200) return 380;
    if (textLen < 500) return 440;
    return 520;
  }

  function showPopup(x, y, textLen) {
    const w = calcPopupWidth(textLen || 0);
    popup.style.width = w + 'px';
    popup.style.display = 'flex';
    positionElement(popup, x, y, w, 300);
  }

  function repositionPopup() {
    const left = parseFloat(popup.style.left) || 0;
    const top = parseFloat(popup.style.top) || 0;
    const w = parseFloat(popup.style.width) || 380;
    const rect = popup.getBoundingClientRect();
    positionElement(popup, left, top, w, rect.height);
  }

  function parseResult(text) {
    const match = text.match(/^\[Language:\s*([^\]]+)\]\s*/);
    if (match) {
      return { lang: match[1].trim(), translated: text.slice(match[0].length) };
    }
    return { lang: null, translated: text };
  }

  function startTranslation(selectedText) {
    fullResult = '';
    resultDiv.textContent = 'Translating...';
    resultDiv.className = 'popup-result loading';
    langBadge.style.display = 'none';
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');

    chrome.storage.sync.get(
      { apiBaseUrl: 'http://121.252.222.39:11434', model: 'translategemma:27b', targetLang: 'Korean', systemPrompt: '' },
      (settings) => {
        if (!settings.model) {
          resultDiv.textContent = 'No model configured. Open extension settings to set up.';
          resultDiv.className = 'popup-result error';
          return;
        }

        const sysPrompt =
          settings.systemPrompt ||
          `You are a professional translator. Translate the given text to ${settings.targetLang}.\nOutput format:\n[Language: <detected source language>]\n<translated text only, no explanation>`;

        const messages = [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: selectedText },
        ];

        currentPort = chrome.runtime.connect({ name: 'translate-stream' });

        currentPort.onMessage.addListener((msg) => {
          if (msg.type === 'chunk') {
            fullResult += msg.text;
            const { lang, translated } = parseResult(fullResult);
            resultDiv.textContent = translated || '...';
            resultDiv.className = 'popup-result';
            if (lang) {
              langBadge.textContent = lang;
              langBadge.style.display = 'inline';
            }
            repositionPopup();
          } else if (msg.type === 'done') {
            if (!fullResult.trim()) {
              resultDiv.textContent = 'Empty response from model.';
              resultDiv.className = 'popup-result error';
            } else {
              resultDiv.className = 'popup-result';
            }
          } else if (msg.type === 'error') {
            resultDiv.textContent = `Error: ${msg.error}`;
            resultDiv.className = 'popup-result error';
          }
        });

        currentPort.postMessage({
          type: 'translate',
          baseUrl: settings.apiBaseUrl,
          model: settings.model,
          messages,
        });
      }
    );
  }

  // Event: text selection
  let selectionTimeout = null;
  document.addEventListener('mouseup', (e) => {
    if (e.target === hostEl || hostEl.contains(e.target)) return;

    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (text.length > 1) {
        hidePopup();
        showIcon(e.clientX + 8, e.clientY - 40);
        icon._selectedText = text;
      }
    }, 50);
  });

  // Event: icon click
  icon.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = icon._selectedText;
    if (!text) return;

    const iconRect = icon.getBoundingClientRect
      ? { x: parseFloat(icon.style.left), y: parseFloat(icon.style.top) }
      : { x: e.clientX, y: e.clientY };

    hideIcon();
    sourceDiv.textContent = text;
    const popupW = calcPopupWidth(text.length);
    showPopup(iconRect.x - popupW / 2, iconRect.y + 40, text.length);
    startTranslation(text);
  });

  // Event: close
  closeBtn.addEventListener('click', hidePopup);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAll();
  });

  document.addEventListener('mousedown', (e) => {
    if (e.target === hostEl || hostEl.contains(e.target)) return;
    // Check if click is on the shadow elements
    const path = e.composedPath();
    if (path.includes(icon) || path.includes(popup)) return;
    hideAll();
  });

  // Event: copy
  copyBtn.addEventListener('click', () => {
    const { translated } = parseResult(fullResult);
    navigator.clipboard.writeText(translated || fullResult).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    });
  });
})();
