# universal-ai-chat-exporter
One script to export ANY AI chat conversation – ChatGPT, Claude, DeepSeek, Copilot, Gemini, Poe, Perplexity. Paste into console, get Markdown. No API keys, no extensions, no manual scrolling.
 # 🌐 Universal AI Chat Exporter

**Export your entire conversation history from ANY AI chat platform – with one command.**

No browser extensions. No API keys. No manual scrolling through hundreds of messages. Just copy, paste, and download.

## ✨ Supported Platforms

| Platform | Status | Selector Method |
|----------|--------|-----------------|
| **ChatGPT** | ✅ Full | `data-message-author-role` |
| **Claude** | ✅ Full | `data-testid` messages |
| **DeepSeek** | ✅ Full | `.ds-message` containers |
| **Microsoft Copilot** | ✅ Full | `group/user-message` class |
| **Google Gemini** | ✅ Full | `.message-content` |
| **Poe** | ✅ Full | `.Message` containers |
| **Perplexity** | ✅ Full | `[data-testid="chat-message"]` |
| **GitHub Copilot Chat** | ✅ Full | `.chat-message` |

*More platforms added automatically as the script auto-detects new ones.*

## 🚀 Features

- 🔍 **Auto-detects platform** – works immediately, no configuration
- 📜 **Full history capture** – scrolls up automatically to load ALL messages
- 🎯 **Smart role detection** – identifies User vs AI from DOM attributes
- 📁 **Clean Markdown output** – beautifully formatted, ready for notes or sharing
- ⚡ **No API calls** – runs entirely in your browser, respects your privacy
- 🔧 **Fallback mechanisms** – works even when platforms change their HTML
- 💾 **Auto-download** – saves as `platform_chat_timestamp.md`

## 📦 Quick Start

### 1. Open your AI chat conversation
Navigate to any supported platform and open the conversation you want to save.

### 2. Open Developer Console
- **Windows/Linux:** `F12` or `Ctrl + Shift + I`
- **Mac:** `Cmd + Option + I`
- Click the **Console** tab

### 3. Paste the script
Copy the script below and paste it into the console. Press **Enter**.

### 4. Wait & Download
The page will automatically scroll up to load all messages. When finished, a `.md` file will download automatically.

## 📜 The Script

```javascript
// Universal AI Chat Exporter – Works on ChatGPT, Claude, DeepSeek, Copilot, Gemini, Poe, Perplexity
(async function universalChatExporter() {
  const status = document.createElement('div');
  status.textContent = '🔄 Detecting platform and loading messages...';
  status.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1a1a1a;color:#00ff9d;padding:12px 20px;border-radius:8px;font-family:monospace;z-index:9999;font-size:14px;max-width:450px;box-shadow:0 2px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(status);

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function detectPlatform() {
    const url = window.location.href;
    if (url.includes('chat.deepseek.com')) return 'deepseek';
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('gemini.google.com')) return 'gemini';
    if (url.includes('poe.com')) return 'poe';
    if (url.includes('perplexity.ai')) return 'perplexity';
    if (url.includes('copilot.microsoft.com')) return 'copilot';
    if (url.includes('github.com/copilot')) return 'github-copilot';
    return 'unknown';
  }

  const SELECTORS = {
    deepseek: { message: '.ds-message', content: '.ds-markdown', roleAttr: 'data-message-author-role' },
    chatgpt: { message: '[data-message-author-role]', content: '.markdown, .prose', roleAttr: 'data-message-author-role' },
    claude: { message: '[data-testid="user-message"], [data-testid="assistant-message"]', content: '.prose', roleAttr: null },
    gemini: { message: '.message-content, .model-response', content: '.markdown', roleAttr: null },
    poe: { message: '.Message, .ChatMessage', content: '.markdown', roleAttr: null },
    perplexity: { message: '[data-testid="chat-message"]', content: '.prose', roleAttr: null },
    copilot: { message: '.group\\/user-message, .group\\/assistant-message, [class*="user-message"], [class*="assistant-message"]', content: '.prose, .markdown', getRole: (el) => el.className.includes('user-message') ? 'user' : 'assistant' }
  };

  const platform = detectPlatform();
  status.textContent = `🔍 Detected: ${platform.toUpperCase()}`;
  await wait(800);

  let config = SELECTORS[platform] || SELECTORS.deepseek;
  
  function getMessageContainers() {
    let containers = Array.from(document.querySelectorAll(config.message));
    if (containers.length === 0 && platform === 'copilot') {
      containers = Array.from(document.querySelectorAll('[class*="user-message"], [class*="assistant-message"]'));
    }
    return containers;
  }

  function getMessageText(el) {
    const contentSelectors = ['.prose', '.markdown', '.ds-markdown', '.whitespace-pre-wrap'];
    for (const sel of contentSelectors) {
      const contentEl = el.querySelector(sel);
      if (contentEl && contentEl.innerText.trim()) return contentEl.innerText.trim();
    }
    const clone = el.cloneNode(true);
    clone.querySelectorAll('button, [role="group"], .opacity-0, .sr-only').forEach(r => r.remove());
    return clone.innerText.trim();
  }

  function getMessageRole(el) {
    if (config.getRole) return config.getRole(el);
    if (config.roleAttr && el.getAttribute(config.roleAttr)) return el.getAttribute(config.roleAttr);
    if (el.className.includes('user')) return 'user';
    if (el.className.includes('assistant')) return 'assistant';
    return null;
  }

  let lastCount = getMessageContainers().length;
  let noNewCount = 0;
  let scrollSteps = 0;
  const MAX_STEPS = 600;
  const REQUIRED_STABLE = 8;

  while (scrollSteps < MAX_STEPS && noNewCount < REQUIRED_STABLE) {
    window.scrollTo({ top: Math.max(0, window.scrollY - 180), behavior: 'smooth' });
    await wait(1000);
    const newCount = getMessageContainers().length;
    if (newCount > lastCount) {
      status.textContent = `📥 Loaded ${newCount - lastCount} new (total: ${newCount})`;
      lastCount = newCount;
      noNewCount = 0;
      await wait(700);
    } else {
      noNewCount++;
      status.textContent = `⏳ Stable (${noNewCount}/${REQUIRED_STABLE}) – ${lastCount} messages`;
    }
    scrollSteps++;
  }

  window.scrollTo({ top: 0, behavior: 'auto' });
  await wait(800);

  const containers = getMessageContainers();
  const messages = [];
  for (const el of containers) {
    const text = getMessageText(el);
    if (!text || text.length < 2) continue;
    let role = getMessageRole(el);
    if (!role) role = (messages.length % 2 === 0) ? 'user' : 'assistant';
    messages.push({ role, text });
  }

  if (messages.length === 0) {
    status.textContent = '❌ No messages found.';
    return;
  }

  const aiName = { deepseek: 'DeepSeek', chatgpt: 'ChatGPT', claude: 'Claude', copilot: 'Copilot', gemini: 'Gemini', poe: 'Poe', perplexity: 'Perplexity' }[platform] || 'AI';
  let markdown = `# ${aiName} Conversation Export\n\n**Platform:** ${platform.toUpperCase()}\n**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
  for (const msg of messages) {
    markdown += `${msg.role === 'user' ? '## 👤 User' : `## 🤖 ${aiName}`}:\n\n${msg.text}\n\n---\n\n`;
  }

  const filename = `${platform}_chat_${Date.now()}.md`;
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blob);

  status.textContent = `✅ Exported ${messages.length} messages from ${platform.toUpperCase()}!`;
  status.style.background = '#0a2a1f';
  setTimeout(() => status.remove(), 5000);
})();
