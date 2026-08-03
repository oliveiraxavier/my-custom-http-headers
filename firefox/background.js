const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const webRequest = typeof browser !== 'undefined' ? browser.webRequest : chrome.webRequest;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
const session = typeof browser !== 'undefined' ? browser.storage.session : chrome.storage.session;

let activeHeaders = [];
let activeDomains = [];

function onBeforeSendHeaders(details) {
  const headers = details.requestHeaders || [];
  const normalized = new Map(headers.map(h => [h.name.toLowerCase(), h]));

  activeHeaders.forEach(custom => {
    const nameLower = custom.key.toLowerCase();
    if (normalized.has(nameLower)) {
      normalized.get(nameLower).value = custom.value;
    } else {
      headers.push({ name: custom.key, value: custom.value });
    }
  });

  return { requestHeaders: headers };
}

function updateListener() {
  webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);

  if (activeHeaders.length > 0 && activeDomains && activeDomains.length > 0) {
    webRequest.onBeforeSendHeaders.addListener(
      onBeforeSendHeaders,
      {
        urls: activeDomains,
        types: [
          'main_frame',
          'sub_frame',
          'xmlhttprequest',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'media',
          'websocket',
          'other'
        ]
      },
      ['blocking', 'requestHeaders']
    );
  }
}

async function loadActiveProjectData() {
  const localData = await storage.local.get('currentProject');
  const sessionData = await session.get(['unlockedProject', 'unlockedData']);

  if (localData.currentProject && localData.currentProject === sessionData.unlockedProject && sessionData.unlockedData) {
    activeHeaders = sessionData.unlockedData.headers || [];
    activeDomains = sessionData.unlockedData.domains || [];
  } else {
    activeHeaders = [];
    activeDomains = [];
  }
  updateListener();
  updateIcon();
}

function updateIcon() {
  const action = typeof browser !== 'undefined' ? browser.action : chrome.action;
  const hasActiveDomains = Array.isArray(activeDomains) && activeDomains.length > 0;

  if (activeHeaders.length > 0 && hasActiveDomains) {
    action.setIcon({
      path: {
        '48': 'icons/48.png',
        '96': 'icons/96.png'
      }
    });
  } else {
    action.setIcon({
      path: {
        '48': 'icons/icon-default.png',
        '96': 'icons/icon-default.png'
      }
    });
  }
}

// ----------------- Secure local encryption API -----------------
// This implements AES-GCM client-side encryption with a passphrase-derived key.
// Important: the passphrase is NOT stored. The UI must request it from the user
// when saving/loading encrypted projects.

const DEFAULT_PBKDF2_ITERATIONS = 150000;

function validateSender(sender) {
  // Accept only messages originating from extension pages (popup/options) and
  // from the same extension. Messages from content scripts have `sender.tab`.
  try {
    const idMatches = !!(sender && sender.id && sender.id === (runtime && runtime.id));
    return idMatches && !sender.tab;
  } catch (e) {
    return false;
  }
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase, salt, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptString(plainText, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt.buffer);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return {
    v: 1,
    iterations: DEFAULT_PBKDF2_ITERATIONS,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    cipher: toBase64(cipher)
  };
}

async function decryptToString(obj, passphrase) {
  const salt = fromBase64(obj.salt);
  const iv = fromBase64(obj.iv);
  const cipher = fromBase64(obj.cipher);
  const key = await deriveKey(passphrase, salt, obj.iterations || DEFAULT_PBKDF2_ITERATIONS);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

async function storeEncryptedProject(projectName, projectData, passphrase) {
  const plainText = JSON.stringify(projectData);
  const encrypted = await encryptString(plainText, passphrase);
  const key = `project_encrypted_${projectName}`;
  const store = {};
  store[key] = encrypted;
  await storage.local.set(store);
}

async function getDecryptedProjectData(projectName, passphrase) {
  const key = `project_encrypted_${projectName}`;
  const result = await storage.local.get([key]);
  const obj = result[key];
  if (!obj) throw new Error('not_found');
  const plain = await decryptToString(obj, passphrase);
  return JSON.parse(plain);
}

// Secure messaging API: only extension pages (popup/options) can call these actions.
runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!validateSender(sender)) {
      sendResponse({ error: 'invalid_sender' });
      return;
    }

    try {
      if (msg && msg.action === 'saveEncryptedProject') {
        const { name, data, passphrase } = msg;
        if (!name || !data || !passphrase) {
          sendResponse({ error: 'missing_fields' });
          return;
        }
        await storeEncryptedProject(name, data, passphrase);
        await loadActiveProjectData();
        sendResponse({ ok: true });
        return;
      }

      if (msg && msg.action === 'loadDecryptedProject') {
        const { name, passphrase } = msg;
        if (!name || !passphrase) {
          sendResponse({ error: 'missing_fields' });
          return;
        }
        const data = await getDecryptedProjectData(name, passphrase);
        
        // This message only validates the password and returns the data to the popup.
        // The popup will then store it in the session, which will trigger
        // the storage.onChanged listener to update the background script's state.
        sendResponse({ ok: true, data });
        return;
      }

      sendResponse({ error: 'unknown_action' });
    } catch (err) {
      sendResponse({ error: err && err.message ? err.message : String(err) });
    }
  })();
  return true; // indicate async response
});

storage.onChanged.addListener(async (changes) => {
  // If the unlocked data in the session changes, reload the active project data.
  if (changes.unlockedData) {
    await loadActiveProjectData();
  }
});

loadActiveProjectData();
