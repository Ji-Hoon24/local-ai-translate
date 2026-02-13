const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const testBtn = document.getElementById('testBtn');
const testResult = document.getElementById('testResult');
const modelSelect = document.getElementById('model');
const fetchModelsBtn = document.getElementById('fetchModelsBtn');
const modelStatus = document.getElementById('modelStatus');
const targetLangSelect = document.getElementById('targetLang');
const systemPromptInput = document.getElementById('systemPrompt');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

// Load saved settings
chrome.storage.sync.get(
  { apiBaseUrl: 'http://localhost:11434', model: '', targetLang: 'Korean', systemPrompt: '' },
  (items) => {
    apiBaseUrlInput.value = items.apiBaseUrl;
    targetLangSelect.value = items.targetLang;
    systemPromptInput.value = items.systemPrompt;
    if (items.model) {
      const opt = document.createElement('option');
      opt.value = items.model;
      opt.textContent = items.model;
      opt.selected = true;
      modelSelect.appendChild(opt);
    }
  }
);

function isLocalUrl(url) {
  try {
    const u = new URL(url.includes('://') ? url : 'http://' + url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function ensureHostPermission(url) {
  if (isLocalUrl(url)) return true;
  try {
    const u = new URL(url.includes('://') ? url : 'http://' + url);
    const origin = u.origin + '/*';
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (has) return true;
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = 'status-msg ' + type;
  if (type === 'success') {
    setTimeout(() => {
      el.textContent = '';
      el.className = 'status-msg';
    }, 3000);
  }
}

// Test connection
testBtn.addEventListener('click', async () => {
  const url = apiBaseUrlInput.value.trim();
  if (!url) {
    showStatus(testResult, 'Please enter an API URL.', 'error');
    return;
  }
  const granted = await ensureHostPermission(url);
  if (!granted) {
    showStatus(testResult, 'Permission denied for this URL.', 'error');
    return;
  }
  testBtn.disabled = true;
  testBtn.textContent = '...';
  chrome.runtime.sendMessage({ type: 'testConnection', baseUrl: url }, (resp) => {
    testBtn.disabled = false;
    testBtn.textContent = 'Test';
    if (resp && resp.success) {
      showStatus(testResult, 'Connected successfully!', 'success');
    } else {
      showStatus(testResult, resp?.error || 'Connection failed.', 'error');
    }
  });
});

// Fetch models
fetchModelsBtn.addEventListener('click', async () => {
  const url = apiBaseUrlInput.value.trim();
  if (!url) {
    showStatus(modelStatus, 'Please enter an API URL first.', 'error');
    return;
  }
  const granted = await ensureHostPermission(url);
  if (!granted) {
    showStatus(modelStatus, 'Permission denied for this URL.', 'error');
    return;
  }
  fetchModelsBtn.disabled = true;
  fetchModelsBtn.textContent = '...';
  chrome.runtime.sendMessage({ type: 'fetchModels', baseUrl: url }, (resp) => {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = 'Fetch';
    if (resp && resp.success) {
      const currentModel = modelSelect.value;
      modelSelect.innerHTML = '<option value="">-- Select a model --</option>';
      resp.models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        if (m === currentModel) opt.selected = true;
        modelSelect.appendChild(opt);
      });
      showStatus(modelStatus, `Found ${resp.models.length} model(s).`, 'success');
    } else {
      showStatus(modelStatus, resp?.error || 'Failed to fetch models.', 'error');
    }
  });
});

// Save settings
saveBtn.addEventListener('click', () => {
  const settings = {
    apiBaseUrl: apiBaseUrlInput.value.trim() || 'http://localhost:11434',
    model: modelSelect.value,
    targetLang: targetLangSelect.value,
    systemPrompt: systemPromptInput.value.trim(),
  };
  chrome.storage.sync.set(settings, () => {
    showStatus(saveStatus, 'Settings saved!', 'success');
  });
});
