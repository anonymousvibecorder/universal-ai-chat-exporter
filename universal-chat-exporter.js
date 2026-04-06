// Universal AI Chat Exporter – Works on ChatGPT, Claude, DeepSeek, Copilot, Gemini, Poe, Perplexity
(async function universalChatExporter() {
  const status = document.createElement('div');
  status.textContent = '🔄 Detecting platform and loading messages...';
  status.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1a1a1a;color:#00ff9d;padding:12px 20px;border-radius:8px;font-family:monospace;z-index:9999;font-size:14px;max-width:450px;box-shadow:0 2px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(status);

  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ========== PLATFORM DETECTION ==========
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

  // ========== PLATFORM-SPECIFIC SELECTORS ==========
  const SELECTORS = {
    deepseek: {
      message: '.ds-message',
      content: '.ds-markdown',
      roleAttr: 'data-message-author-role'
    },
    chatgpt: {
      message: '[data-message-author-role]',
      content: '.markdown, .prose',
      roleAttr: 'data-message-author-role'
    },
    claude: {
      message: '[data-testid="user-message"], [data-testid="assistant-message"]',
      content: '.prose',
      roleAttr: null
    },
    gemini: {
      message: '.message-content, .model-response',
      content: '.markdown',
      roleAttr: null
    },
    poe: {
      message: '.Message, .ChatMessage',
      content: '.markdown',
      roleAttr: null
    },
    perplexity: {
      message: '[data-testid="chat-message"]',
      content: '.prose',
      roleAttr: null
    },
    copilot: {
      message: '.group\\/user-message, .group\\/assistant-message, [class*="user-message"], [class*="assistant-message"]',
      content: '.prose, .markdown, .whitespace-pre-wrap, div:not([class*="reactions"])',
      getRole: (el) => {
        if (el.className.includes('user-message')) return 'user';
        if (el.className.includes('assistant-message')) return 'assistant';
        return null;
      }
    }
  };

  const platform = detectPlatform();
  status.textContent = `🔍 Detected: ${platform.toUpperCase()}`;
  console.log(`Platform: ${platform}`);
  await wait(800);

  let config = SELECTORS[platform] || SELECTORS.deepseek;
  
  // ========== FIND MESSAGE CONTAINERS ==========
  function getMessageContainers() {
    let containers = [];
    
    if (config.message) {
      const found = document.querySelectorAll(config.message);
      if (found.length > 0) {
        containers = Array.from(found);
        console.log(`Found ${containers.length} messages`);
      }
    }
    
    if (containers.length === 0 && platform === 'copilot') {
      containers = Array.from(document.querySelectorAll('[class*="user-message"], [class*="assistant-message"]'));
      console.log(`Fallback found ${containers.length} Copilot messages`);
    }
    
    return containers;
  }

  function getMessageText(el) {
    const contentSelectors = ['prose', 'markdown', 'whitespace-pre-wrap', '.ac-text', '.response-content'];
    for (const sel of contentSelectors) {
      const contentEl = el.querySelector(sel);
      if (contentEl && contentEl.innerText.trim()) {
        return contentEl.innerText.trim();
      }
    }
    const clone = el.cloneNode(true);
    const remove = clone.querySelectorAll('button, [role="group"], .opacity-0, .sr-only');
    remove.forEach(r => r.remove());
    return clone.innerText.trim();
  }

  function getMessageRole(el) {
    if (config.getRole) return config.getRole(el);
    
    const classes = el.className;
    if (classes.includes('user') || classes.includes('User')) return 'user';
    if (classes.includes('assistant') || classes.includes('Assistant')) return 'assistant';
    
    const roleAttr = el.getAttribute('data-message-author-role');
    if (roleAttr) return roleAttr;
    
    return null;
  }

  // ========== LOAD ALL MESSAGES ==========
  let lastCount = getMessageContainers().length;
  let noNewCount = 0;
  let scrollSteps = 0;
  const MAX_STEPS = 600;
  const REQUIRED_STABLE = 8;

  status.textContent = `📥 Found ${lastCount} messages, loading older...`;

  while (scrollSteps < MAX_STEPS && noNewCount < REQUIRED_STABLE) {
    const target = Math.max(0, window.scrollY - 180);
    window.scrollTo({ top: target, behavior: 'smooth' });
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

  // ========== EXTRACT MESSAGES ==========
  const containers = getMessageContainers();
  const messages = [];

  for (let i = 0; i < containers.length; i++) {
    const el = containers[i];
    let text = getMessageText(el);
    if (!text || text.length < 2) continue;
    
    let role = getMessageRole(el);
    if (!role) {
      role = (messages.length % 2 === 0) ? 'user' : 'assistant';
    }
    
    messages.push({ role, text });
  }

  if (messages.length === 0) {
    status.textContent = '❌ No messages found. Run diagnostic.';
    console.error('No messages extracted');
    return;
  }

  // ========== BUILD MARKDOWN ==========
  const aiName = platform === 'copilot' ? 'Copilot' : 
                 platform === 'chatgpt' ? 'ChatGPT' :
                 platform === 'claude' ? 'Claude' :
                 platform === 'deepseek' ? 'DeepSeek' : 'AI';

  let markdown = `# ${aiName} Conversation Export\n\n`;
  markdown += `**Platform:** ${platform.toUpperCase()}\n`;
  markdown += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;

  for (const msg of messages) {
    const header = msg.role === 'user' ? '## 👤 User' : `## 🤖 ${aiName}`;
    markdown += `${header}:\n\n${msg.text}\n\n---\n\n`;
  }

  // ========== DOWNLOAD ==========
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
  
  console.log(`🎉 Exported ${messages.length} messages`);
})();