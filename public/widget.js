/* Palette AI Bot Widget v1
 * Usage: <script src="https://ai.palette-lab.com/widget.js?id=A0005" async></script>
 */
(function () {
  'use strict';

  // ────────────────────────────────────────────────
  // Config & URL resolution
  // ────────────────────────────────────────────────
  var currentScript = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var scriptSrc = currentScript ? currentScript.src : '';
  var apiBase = scriptSrc ? scriptSrc.split('/widget.js')[0] : '';
  if (!apiBase) {
    console.warn('[palette-bot] cannot resolve apiBase');
    return;
  }

  // paletteId: ?id=A0005 or data-palette-id
  var paletteId = '';
  try {
    var url = new URL(scriptSrc);
    paletteId = (url.searchParams.get('id') || '').toUpperCase();
  } catch (e) { /* noop */ }
  if (!paletteId && currentScript) {
    paletteId = (currentScript.getAttribute('data-palette-id') || '').toUpperCase();
  }
  if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
    console.warn('[palette-bot] invalid paletteId');
    return;
  }

  // Visitor ID (persist in localStorage)
  var visitorId = '';
  try {
    visitorId = localStorage.getItem('palette_bot_visitor_id') || '';
    if (!visitorId) {
      visitorId = 'vis-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('palette_bot_visitor_id', visitorId);
    }
  } catch (e) {
    visitorId = 'vis-' + Date.now();
  }

  // State
  var state = {
    config: null,
    sessionId: null,
    open: false,
    messages: [],
    sending: false,
  };

  // ────────────────────────────────────────────────
  // Styles (injected into shadow DOM)
  // ────────────────────────────────────────────────
  var STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif; }
    .bubble {
      position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px;
      border-radius: 50%; background: var(--color, #6366f1);
      color: #fff; border: none; cursor: pointer; box-shadow: 0 10px 30px rgba(99,102,241,0.35);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s; z-index: 2147483647;
    }
    .bubble:hover { transform: scale(1.1); }
    .bubble svg { width: 24px; height: 24px; }
    .panel {
      position: fixed; bottom: 100px; right: 24px; width: 380px; max-width: calc(100vw - 32px);
      height: 580px; max-height: calc(100vh - 140px);
      background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      display: flex; flex-direction: column; overflow: hidden;
      z-index: 2147483647;
    }
    .header { padding: 16px; background: var(--color, #6366f1); color: #fff; display: flex; align-items: center; gap: 10px; }
    .header-title { font-weight: bold; font-size: 14px; flex: 1; }
    .header-close { background: rgba(255,255,255,0.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; }
    .msg { display: flex; margin-bottom: 12px; gap: 8px; }
    .msg.user { flex-direction: row-reverse; }
    .msg-bubble { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
    .msg.bot .msg-bubble { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .msg.user .msg-bubble { background: var(--color, #6366f1); color: #fff; }
    .cards { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;
      font-size: 12px; cursor: pointer; transition: all 0.2s;
    }
    .card:hover { border-color: var(--color, #6366f1); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .card-name { font-weight: bold; color: #1e293b; margin-bottom: 4px; }
    .card-meta { color: #64748b; font-size: 11px; margin-bottom: 6px; }
    .card-desc { color: #475569; line-height: 1.4; }
    .cta-btn {
      display: inline-block; margin-top: 10px; padding: 10px 18px;
      background: var(--color, #6366f1); color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: bold; font-size: 13px; text-align: center;
      border: none; cursor: pointer;
    }
    .nurture-opts { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .nurture-opts a {
      padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 12px; text-decoration: none; color: #475569;
    }
    .input-area { padding: 12px; border-top: 1px solid #e2e8f0; background: #fff; display: flex; gap: 8px; }
    .input-area input {
      flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
      font-size: 13px; outline: none;
    }
    .input-area input:focus { border-color: var(--color, #6366f1); }
    .send-btn {
      background: var(--color, #6366f1); color: #fff; border: none; border-radius: 50%;
      width: 40px; height: 40px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .lead-form { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 8px; }
    .lead-form label { display: block; font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px; margin-top: 8px; }
    .lead-form label:first-child { margin-top: 0; }
    .lead-form input { width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; }
    .lead-form button {
      width: 100%; margin-top: 12px; padding: 10px; background: var(--color, #6366f1); color: #fff;
      border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
    }
    .typing { display: inline-flex; gap: 4px; padding: 10px 14px; }
    .typing span { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; animation: typing 1.4s infinite ease-in-out; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    @media (max-width: 480px) {
      .panel { bottom: 0; right: 0; left: 0; width: 100%; max-width: 100%; height: 100vh; max-height: 100vh; border-radius: 0; }
      .bubble { bottom: 16px; right: 16px; }
    }
  `;

  // ────────────────────────────────────────────────
  // DOM
  // ────────────────────────────────────────────────
  var host = document.createElement('div');
  host.id = 'palette-bot-host';
  host.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;';
  var shadow = host.attachShadow({ mode: 'open' });

  var styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  shadow.appendChild(styleEl);

  var bubble = document.createElement('button');
  bubble.className = 'bubble';
  bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  bubble.addEventListener('click', togglePanel);
  shadow.appendChild(bubble);

  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.display = 'none';
  shadow.appendChild(panel);

  document.body.appendChild(host);

  // ────────────────────────────────────────────────
  // API helpers
  // ────────────────────────────────────────────────
  function apiGet(path) {
    return fetch(apiBase + path, { method: 'GET' }).then(function (r) { return r.json(); });
  }
  function apiPost(path, body) {
    return fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.json(); });
  }

  // ────────────────────────────────────────────────
  // Rendering
  // ────────────────────────────────────────────────
  function render() {
    var cfg = state.config || {};
    var color = (cfg.appearance && cfg.appearance.primaryColor) || '#6366f1';
    panel.style.setProperty('--color', color);
    bubble.style.setProperty('--color', color);

    panel.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'header';
    var title = document.createElement('div');
    title.className = 'header-title';
    title.textContent = (cfg.appearance && cfg.appearance.botName) || 'AIアシスタント';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'header-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', togglePanel);
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Messages
    var msgs = document.createElement('div');
    msgs.className = 'messages';
    state.messages.forEach(function (m) { msgs.appendChild(renderMessage(m)); });
    if (state.sending) {
      var typing = document.createElement('div');
      typing.className = 'msg bot';
      typing.innerHTML = '<div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
      msgs.appendChild(typing);
    }
    panel.appendChild(msgs);

    // Input
    var inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'メッセージを入力...';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) sendMessage(input.value.trim());
    });
    var sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.innerHTML = '→';
    sendBtn.disabled = state.sending;
    sendBtn.addEventListener('click', function () {
      if (input.value.trim()) sendMessage(input.value.trim());
    });
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);

    // Auto scroll
    setTimeout(function () { msgs.scrollTop = msgs.scrollHeight; }, 10);
  }

  function renderMessage(m) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'visitor' ? 'user' : 'bot');

    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'msg-bubble';
    bubbleEl.textContent = m.content;
    wrap.appendChild(bubbleEl);

    // UI content (cards, cta, etc)
    if (m.ui) {
      if (m.ui.type === 'cards' && Array.isArray(m.ui.cards)) {
        var cardsEl = document.createElement('div');
        cardsEl.className = 'cards';
        m.ui.cards.forEach(function (c) {
          var cardEl = document.createElement('div');
          cardEl.className = 'card';
          cardEl.innerHTML =
            '<div class="card-name"></div>' +
            '<div class="card-meta"></div>' +
            '<div class="card-desc"></div>';
          cardEl.querySelector('.card-name').textContent = c.name || '';
          cardEl.querySelector('.card-meta').textContent = [c.price, c.duration].filter(Boolean).join(' / ');
          cardEl.querySelector('.card-desc').textContent = c.features || c.description || '';
          cardEl.addEventListener('click', function () {
            sendMessage('「' + c.name + '」が気になります');
          });
          cardsEl.appendChild(cardEl);
        });
        wrap.appendChild(cardsEl);
      } else if (m.ui.type === 'closing_cta' && m.ui.cta) {
        var cta = m.ui.cta;
        var btn = document.createElement(cta.url ? 'a' : 'button');
        btn.className = 'cta-btn';
        if (cta.url) {
          btn.setAttribute('href', cta.url);
          btn.setAttribute('target', '_blank');
          btn.setAttribute('rel', 'noopener noreferrer');
        }
        btn.textContent = cta.label || 'こちら';
        if (cta.key === 'phone' && cta.number) {
          btn.setAttribute('href', 'tel:' + cta.number);
        }
        btn.addEventListener('click', function () {
          submitLead({}, cta.key);
        });
        wrap.appendChild(btn);
      } else if (m.ui.type === 'nurture_options' && Array.isArray(m.ui.options)) {
        var opts = document.createElement('div');
        opts.className = 'nurture-opts';
        m.ui.options.forEach(function (o) {
          var a = document.createElement('a');
          a.href = o.url || '#';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = o.label || o.type;
          a.addEventListener('click', function () {
            submitLead({}, o.type);
          });
          opts.appendChild(a);
        });
        wrap.appendChild(opts);
      } else if (m.ui.type === 'lead_form' && Array.isArray(m.ui.fields)) {
        var form = document.createElement('div');
        form.className = 'lead-form';
        var leadData = {};
        m.ui.fields.forEach(function (f) {
          var lab = document.createElement('label');
          lab.textContent = f.label + (f.required ? ' *' : '');
          var inp = document.createElement('input');
          inp.type = f.field === 'email' ? 'email' : f.field === 'phone' ? 'tel' : 'text';
          inp.addEventListener('input', function (e) { leadData[f.field] = e.target.value; });
          form.appendChild(lab);
          form.appendChild(inp);
        });
        var sub = document.createElement('button');
        sub.textContent = '送信する';
        sub.addEventListener('click', function () {
          submitLead(leadData, null);
          form.innerHTML = '<div style="text-align:center;color:#10b981;font-weight:bold;">送信しました。ありがとうございます！</div>';
        });
        form.appendChild(sub);
        wrap.appendChild(form);
      }
    }

    return wrap;
  }

  function togglePanel() {
    state.open = !state.open;
    panel.style.display = state.open ? 'flex' : 'none';
    bubble.style.display = state.open ? 'none' : 'flex';
    if (state.open && state.messages.length === 0) {
      // Show welcome
      var welcome = (state.config && state.config.conversation && state.config.conversation.welcomeMessage) ||
        'こんにちは！何かお困りですか？';
      state.messages.push({ role: 'bot', content: welcome });
      render();
    } else {
      render();
    }
  }

  function sendMessage(text) {
    if (state.sending) return;
    state.messages.push({ role: 'visitor', content: text });
    state.sending = true;
    render();

    apiPost('/api/bot/chat', {
      paletteId: paletteId,
      sessionId: state.sessionId,
      message: text,
      visitorId: visitorId,
    }).then(function (res) {
      if (res && res.success) {
        state.sessionId = res.sessionId;
        state.messages.push({ role: 'bot', content: res.reply, ui: res.ui });
      } else {
        state.messages.push({ role: 'bot', content: 'すみません、エラーが発生しました。' });
      }
    }).catch(function () {
      state.messages.push({ role: 'bot', content: '接続エラーです。' });
    }).finally(function () {
      state.sending = false;
      render();
    });
  }

  function submitLead(lead, closedAction) {
    if (!state.sessionId) return;
    apiPost('/api/bot/lead', {
      sessionId: state.sessionId,
      lead: lead,
      closedAction: closedAction,
    }).catch(function () { /* noop */ });
  }

  // ────────────────────────────────────────────────
  // Init
  // ────────────────────────────────────────────────
  apiGet('/api/bot/config?id=' + paletteId).then(function (res) {
    if (!res || !res.success) {
      if (res && res.reason === 'plan_required') {
        console.info('[palette-bot] Palette AIX plan required for paletteId=' + paletteId);
      } else {
        console.warn('[palette-bot] config load failed:', res && res.error);
      }
      // 契約なし or エラー時はバブルを表示しない
      host.remove();
      return;
    }
    state.config = res.config;
    var delay = (res.config && res.config.appearance && res.config.appearance.welcomeDelay) || 0;
    setTimeout(function () {
      render();
    }, delay * 1000);
  }).catch(function (err) {
    console.warn('[palette-bot] init error:', err);
    host.remove();
  });
})();
