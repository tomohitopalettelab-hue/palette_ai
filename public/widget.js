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

    /* Floating bubble */
    .bubble {
      position: fixed; bottom: 24px; width: 60px; height: 60px;
      border-radius: var(--bubble-radius, 50%);
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 10px 30px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.25s cubic-bezier(.2,.7,.2,1), box-shadow 0.25s; z-index: 2147483647;
    }
    .bubble.right { right: 24px; }
    .bubble.left { left: 24px; }
    .bubble:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 14px 36px rgba(99,102,241,0.45), 0 2px 6px rgba(0,0,0,0.1); }
    .bubble svg { width: 26px; height: 26px; }

    /* Main panel */
    .panel {
      position: fixed; bottom: 100px; width: 400px; max-width: calc(100vw - 32px);
      height: 620px; max-height: calc(100vh - 140px);
      background: rgba(255,255,255,0.65);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.6);
      box-shadow: 0 30px 60px -15px rgba(0,0,0,0.25), 0 15px 30px -10px rgba(0,0,0,0.1);
      display: flex; flex-direction: column; overflow: hidden;
      z-index: 2147483647;

      /* 初期: 非表示（下からフワッと）*/
      opacity: 0;
      transform: translateY(24px) scale(0.92);
      transform-origin: bottom right;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
        visibility 0s linear 0.35s;
    }
    .panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      visibility: visible;
      pointer-events: auto;
      transition:
        opacity 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
        transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
        visibility 0s linear 0s;
    }
    .panel.right { right: 24px; transform-origin: bottom right; }
    .panel.left { left: 24px; transform-origin: bottom left; }

    /* バブルのフワッと表示切替（初期は非表示 → config読込後に.readyで表示）*/
    .bubble {
      opacity: 0;
      visibility: hidden;
      transform: scale(0.7) translateY(8px);
      transition:
        transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
        opacity 0.35s ease,
        box-shadow 0.25s,
        visibility 0s linear 0.35s;
    }
    .bubble.ready {
      opacity: 1;
      visibility: visible;
      transform: scale(1) translateY(0);
      transition:
        transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
        opacity 0.35s ease,
        box-shadow 0.25s,
        visibility 0s linear 0s;
    }
    .bubble.hidden {
      opacity: 0;
      transform: scale(0.4) rotate(-20deg);
      pointer-events: none;
    }

    /* 新規メッセージの軽いフェードイン */
    .msg {
      animation: msgIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .header {
      padding: 18px 18px 14px;
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; display: flex; align-items: center; gap: 10px;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent 60%);
      pointer-events: none;
    }
    .header-icon {
      width: 32px; height: 32px; border-radius: 10px;
      background: rgba(255,255,255,0.2); backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      position: relative; z-index: 1;
    }
    .header-icon svg { width: 16px; height: 16px; }
    .header-title {
      font-weight: 900; font-size: 15px; flex: 1; letter-spacing: 0.02em;
      position: relative; z-index: 1;
    }
    .header-close {
      background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3);
      color: #fff; width: 30px; height: 30px; border-radius: 50%;
      cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; position: relative; z-index: 1;
    }
    .header-close:hover { background: rgba(255,255,255,0.3); transform: scale(1.08); }

    /* Messages area */
    .messages {
      flex: 1; overflow-y: auto; padding: 20px 16px;
      background: linear-gradient(to bottom, rgba(248,250,252,0.4), rgba(248,250,252,0.6));
    }
    .messages::-webkit-scrollbar { width: 5px; }
    .messages::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 10px; }
    .messages::-webkit-scrollbar-track { background: transparent; }

    .msg { display: flex; margin-bottom: 14px; gap: 8px; align-items: flex-start; }
    .msg.user { flex-direction: row-reverse; }
    .msg-avatar {
      width: 30px; height: 30px; border-radius: 10px;
      background: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.9);
      box-shadow: 4px 4px 10px rgba(163,177,198,0.3), -3px -3px 8px rgba(255,255,255,0.8);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .msg-avatar svg { width: 14px; height: 14px; }
    .msg.bot .msg-avatar svg { color: var(--color, #6366f1); }
    .msg.user .msg-avatar svg { color: #94a3b8; }

    .msg-bubble {
      max-width: 78%; padding: 12px 16px; font-size: 13.5px; line-height: 1.6;
      white-space: pre-wrap; word-wrap: break-word; font-weight: 500;
    }
    .msg.bot .msg-bubble {
      background: rgba(255,255,255,0.3);
      border-radius: 22px 22px 22px 4px;
      color: #475569;
      box-shadow: inset 2px 2px 6px rgba(163,177,198,0.3), inset -2px -2px 6px rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.5);
    }
    .msg.user .msg-bubble {
      background: rgba(255,255,255,0.85);
      border-radius: 22px 22px 4px 22px;
      color: #475569;
      box-shadow: 5px 5px 15px rgba(163,177,198,0.35), -3px -3px 10px rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.8);
    }

    /* Cards (service suggestions) */
    .cards { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
    .card {
      background: rgba(255,255,255,0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.7);
      border-radius: 20px; padding: 14px;
      font-size: 12px; cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.04);
      transition: all 0.3s;
    }
    .card:hover {
      transform: translateY(-2px);
      background: rgba(255,255,255,0.9);
      box-shadow: 0 14px 30px rgba(99,102,241,0.12);
      border-color: var(--color, #6366f1);
    }
    .card-name { font-weight: 700; color: #1e293b; margin-bottom: 6px; font-size: 13px; }
    .card-meta { color: var(--color, #6366f1); font-size: 11px; margin-bottom: 8px; font-weight: 700; }
    .card-desc { color: #64748b; line-height: 1.5; }

    /* Closing CTA button */
    .cta-btn {
      display: inline-block; margin-top: 12px; padding: 12px 22px;
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; border-radius: 999px;
      text-decoration: none; font-weight: 700; font-size: 13px; text-align: center;
      border: none; cursor: pointer;
      box-shadow: 0 10px 24px rgba(99,102,241,0.3);
      transition: all 0.25s;
    }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(99,102,241,0.4); }

    /* Nurture options */
    .nurture-opts { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .nurture-opts a {
      padding: 10px 14px;
      background: rgba(255,255,255,0.6);
      border: 1px solid rgba(255,255,255,0.8);
      border-radius: 16px;
      font-size: 12.5px; font-weight: 600; text-decoration: none; color: #475569;
      box-shadow: 4px 4px 10px rgba(163,177,198,0.25), -2px -2px 6px rgba(255,255,255,0.9);
      transition: all 0.25s;
    }
    .nurture-opts a:hover { transform: translateY(-1px); color: var(--color, #6366f1); }

    /* Input area */
    .input-area {
      padding: 14px 16px 16px;
      background: rgba(255,255,255,0.4);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.6);
    }
    .input-inner {
      display: flex; gap: 8px; align-items: center;
      background: rgba(240,242,245,0.5);
      border-radius: 24px; padding: 4px 4px 4px 16px;
      box-shadow: inset 3px 3px 8px rgba(163,177,198,0.35), inset -2px -2px 6px rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.5);
    }
    .input-inner input {
      flex: 1; padding: 10px 0; border: none; background: transparent;
      font-size: 13.5px; outline: none; color: #334155; font-weight: 500;
    }
    .input-inner input::placeholder { color: #94a3b8; }
    .send-btn {
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; border: none; border-radius: 50%;
      width: 40px; height: 40px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 18px rgba(99,102,241,0.35);
      transition: all 0.25s; flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.05); box-shadow: 0 12px 24px rgba(99,102,241,0.45); }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn svg { width: 16px; height: 16px; }

    /* Lead form */
    .lead-form {
      background: rgba(255,255,255,0.5);
      border: 1px solid rgba(255,255,255,0.7);
      border-radius: 18px; padding: 16px; margin-top: 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.04);
    }
    .lead-form label {
      display: block; font-size: 11px; font-weight: 700; color: #64748b;
      margin-bottom: 5px; margin-top: 10px; letter-spacing: 0.03em;
    }
    .lead-form label:first-child { margin-top: 0; }
    .lead-form input {
      width: 100%; padding: 10px 12px;
      border: 1px solid rgba(226,232,240,0.8); border-radius: 10px;
      background: rgba(255,255,255,0.8);
      font-size: 13px; outline: none;
    }
    .lead-form input:focus { border-color: var(--color, #6366f1); }
    .lead-form button {
      width: 100%; margin-top: 14px; padding: 12px;
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; border: none; border-radius: 14px;
      font-weight: 700; cursor: pointer; font-size: 13px;
      box-shadow: 0 8px 20px rgba(99,102,241,0.3);
      transition: all 0.2s;
    }
    .lead-form button:hover { transform: translateY(-1px); }

    /* Typing indicator */
    .typing { display: inline-flex; gap: 5px; padding: 12px 16px; align-items: center; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--color, #6366f1); opacity: 0.6; animation: typing 1.4s infinite ease-in-out; }
    .typing span:nth-child(2) { animation-delay: 0.15s; }
    .typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }

    /* Mobile */
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

  var ICON_PATHS = {
    chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    ai: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a2 2 0 110 4 2 2 0 010-4zm-1 6h2v6h-2v-6zm-3 3h8v2H8v-2z',
    sparkle: 'M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z',
    heart: 'M12 21s-7-4.5-9-9c-1.5-3.5 1-7 5-7 2 0 3 1 4 2 1-1 2-2 4-2 4 0 6.5 3.5 5 7-2 4.5-9 9-9 9z',
    robot: 'M20 5h-3V3a1 1 0 00-2 0v2H9V3a1 1 0 00-2 0v2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zM8 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  };

  var bubble = document.createElement('button');
  bubble.className = 'bubble right';
  bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' + ICON_PATHS.chat + '"/></svg>';
  bubble.addEventListener('click', togglePanel);
  shadow.appendChild(bubble);

  var panel = document.createElement('div');
  panel.className = 'panel right';
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
    var appearance = cfg.appearance || {};
    var color = appearance.primaryColor || '#6366f1';
    var gradientTo = appearance.gradientTo || '';
    var bubbleBg = (appearance.gradient && gradientTo)
      ? 'linear-gradient(135deg, ' + color + ' 0%, ' + gradientTo + ' 100%)'
      : color;
    var bubbleShape = appearance.bubbleShape || 'circle';
    var bubbleRadius = bubbleShape === 'square' ? '12px' : bubbleShape === 'rounded' ? '20px' : '50%';
    var iconStyle = appearance.iconStyle || 'chat';
    var iconPath = ICON_PATHS[iconStyle] || ICON_PATHS.chat;
    var position = appearance.bubblePosition === 'left' ? 'left' : 'right';

    panel.style.setProperty('--color', color);
    panel.style.setProperty('--bubble-bg', bubbleBg);
    bubble.style.setProperty('--color', color);
    bubble.style.setProperty('--bubble-bg', bubbleBg);
    bubble.style.setProperty('--bubble-radius', bubbleRadius);
    // 既存のready/hiddenクラスを保ちつつposition(right/left)を更新
    var bubbleWasReady = bubble.classList.contains('ready');
    var bubbleWasHidden = bubble.classList.contains('hidden');
    bubble.className = 'bubble ' + position + (bubbleWasReady ? ' ready' : '') + (bubbleWasHidden ? ' hidden' : '');
    var panelWasOpen = panel.classList.contains('open');
    panel.className = 'panel ' + position + (panelWasOpen ? ' open' : '');
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' + iconPath + '"/></svg>';

    // 設定が読み込まれて最初のrenderで表示を解禁（フワッと登場）
    if (!bubbleWasReady && !state.open) {
      requestAnimationFrame(function () { bubble.classList.add('ready'); });
    } else if (state.open && !bubbleWasHidden) {
      // パネル開いた状態でのrender → bubbleは非表示のまま
    } else if (!state.open) {
      bubble.classList.add('ready');
    }

    panel.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'header';
    var headerIcon = document.createElement('div');
    headerIcon.className = 'header-icon';
    headerIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' + iconPath + '"/></svg>';
    var title = document.createElement('div');
    title.className = 'header-title';
    title.textContent = (cfg.appearance && cfg.appearance.botName) || 'AIアシスタント';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'header-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', togglePanel);
    header.appendChild(headerIcon);
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
    var inputInner = document.createElement('div');
    inputInner.className = 'input-inner';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'メッセージを入力...';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !(e.nativeEvent && e.nativeEvent.isComposing) && input.value.trim()) {
        sendMessage(input.value.trim());
      }
    });
    var sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
    sendBtn.disabled = state.sending;
    sendBtn.addEventListener('click', function () {
      if (input.value.trim()) sendMessage(input.value.trim());
    });
    inputInner.appendChild(input);
    inputInner.appendChild(sendBtn);
    inputArea.appendChild(inputInner);
    panel.appendChild(inputArea);

    // Auto scroll + 入力欄へフォーカス維持
    setTimeout(function () {
      msgs.scrollTop = msgs.scrollHeight;
      if (!state.sending) {
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    }, 20);
  }

  function renderMessage(m) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'visitor' ? 'user' : 'bot');

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    if (m.role === 'visitor') {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    } else {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z"/></svg>';
    }
    wrap.appendChild(avatar);

    var bubbleWrap = document.createElement('div');
    bubbleWrap.style.display = 'flex';
    bubbleWrap.style.flexDirection = 'column';
    bubbleWrap.style.maxWidth = 'calc(100% - 38px)';
    bubbleWrap.style.alignItems = m.role === 'visitor' ? 'flex-end' : 'flex-start';

    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'msg-bubble';
    bubbleEl.textContent = m.content;
    bubbleWrap.appendChild(bubbleEl);

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
        bubbleWrap.appendChild(cardsEl);
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
        bubbleWrap.appendChild(btn);
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
        bubbleWrap.appendChild(opts);
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
        bubbleWrap.appendChild(form);
      }
    }

    wrap.appendChild(bubbleWrap);
    return wrap;
  }

  function togglePanel() {
    state.open = !state.open;
    if (state.open) {
      if (state.messages.length === 0) {
        var welcome = (state.config && state.config.conversation && state.config.conversation.welcomeMessage) ||
          'こんにちは！何かお困りですか？';
        state.messages.push({ role: 'bot', content: welcome });
      }
      render();
      // 次のフレームでopenクラスを付けてトランジションを発火
      requestAnimationFrame(function () {
        panel.classList.add('open');
        bubble.classList.add('hidden');
      });
    } else {
      panel.classList.remove('open');
      bubble.classList.remove('hidden');
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
