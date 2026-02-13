function normalizeBaseUrl(url) {
  url = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url;
}

async function fetchModels(baseUrl) {
  baseUrl = normalizeBaseUrl(baseUrl);
  const resp = await fetch(`${baseUrl}/v1/models`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const data = await resp.json();
  return (data.data || []).map((m) => m.id);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'fetchModels') {
    fetchModels(msg.baseUrl)
      .then((models) => sendResponse({ success: true, models }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === 'testConnection') {
    const baseUrl = normalizeBaseUrl(msg.baseUrl);
    fetch(`${baseUrl}/v1/models`, { method: 'GET' })
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === 'translateSimple') {
    const baseUrl = normalizeBaseUrl(msg.baseUrl);
    fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: msg.model,
        messages: msg.messages,
        stream: false,
        temperature: 0.3,
      }),
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((data) => {
        const text = data.choices?.[0]?.message?.content || '';
        sendResponse({ success: true, text });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'translate-stream') return;

  let aborted = false;
  let keepAliveTimer = null;

  function startKeepAlive() {
    keepAliveTimer = setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {});
    }, 25000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  port.onDisconnect.addListener(() => {
    aborted = true;
    stopKeepAlive();
  });

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'translate') return;

    const baseUrl = normalizeBaseUrl(msg.baseUrl);
    startKeepAlive();

    try {
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: msg.model,
          messages: msg.messages,
          stream: true,
          temperature: 0.3,
        }),
      });

      if (!resp.ok) {
        port.postMessage({ type: 'error', error: `HTTP ${resp.status}: ${resp.statusText}` });
        stopKeepAlive();
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (aborted) break;
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') {
            port.postMessage({ type: 'done' });
            stopKeepAlive();
            return;
          }

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              port.postMessage({ type: 'chunk', text: delta });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      port.postMessage({ type: 'done' });
    } catch (err) {
      if (!aborted) {
        port.postMessage({ type: 'error', error: err.message });
      }
    } finally {
      stopKeepAlive();
    }
  });
});
