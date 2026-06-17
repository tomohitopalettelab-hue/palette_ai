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
  // デモモード: ?demo=1 が付いていれば契約チェックをスキップし、会話を is_demo として扱う
  var isDemo = false;
  try {
    var url = new URL(scriptSrc);
    paletteId = (url.searchParams.get('id') || '').toUpperCase();
    isDemo = url.searchParams.get('demo') === '1';
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
      position: fixed; bottom: var(--bubble-offset-y, 24px);
      width: var(--bubble-size, 60px); height: var(--bubble-size, 60px);
      border-radius: var(--bubble-radius, 50%);
      background: var(--bubble-bg, var(--color, #6366f1));
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 10px 30px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483647;
      /* 初期非表示。config取得完了後に .ready クラスを付与して表示 */
      opacity: 0;
      visibility: hidden;
      transform: scale(0.7) translateY(8px);
      transition:
        transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
        opacity 0.35s ease,
        box-shadow 0.25s,
        visibility 0s linear 0.35s;
    }
    .bubble.right { right: var(--bubble-offset-x, 24px); }
    .bubble.left { left: var(--bubble-offset-x, 24px); }
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
    .bubble:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 14px 36px rgba(99,102,241,0.45), 0 2px 6px rgba(0,0,0,0.1);
    }
    /* パネル開いている間はバブルを隠す */
    .bubble.hidden {
      opacity: 0;
      visibility: hidden;
      transform: scale(0.4) rotate(-20deg);
      pointer-events: none;
    }
    .bubble svg {
      width: calc(var(--bubble-size, 60px) * 0.43);
      height: calc(var(--bubble-size, 60px) * 0.43);
    }

    /* Bubble animations (ready中のみ発動) */
    .bubble.ready.anim-pulse { animation: bubblePulse 2.2s ease-in-out infinite; }
    .bubble.ready.anim-wobble { animation: bubbleWobble 3s ease-in-out infinite; }
    .bubble.ready.anim-bounce { animation: bubbleBounce 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite; }
    .bubble.ready.anim-shimmer { animation: bubbleShimmer 2.8s ease-in-out infinite; }
    @keyframes bubblePulse {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.07) translateY(-1px); box-shadow: 0 16px 40px rgba(99,102,241,0.55), 0 4px 10px rgba(0,0,0,0.1); }
    }
    @keyframes bubbleWobble {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-6deg); }
      75% { transform: rotate(6deg); }
    }
    @keyframes bubbleBounce {
      0%, 30%, 60%, 100% { transform: translateY(0); }
      45% { transform: translateY(-12px); }
      70% { transform: translateY(-5px); }
    }
    @keyframes bubbleShimmer {
      0%, 100% { box-shadow: 0 10px 30px rgba(99,102,241,0.35), 0 0 0 rgba(99,102,241,0); }
      50% { box-shadow: 0 14px 36px rgba(99,102,241,0.5), 0 0 26px rgba(99,102,241,0.65); }
    }

    /* Bubble tooltip */
    .tooltip {
      position: fixed; bottom: calc(24px + (var(--bubble-size, 60px) - 44px) / 2);
      z-index: 2147483647;
      padding: 10px 16px;
      font-size: 13px; font-weight: 700;
      color: #1e293b;
      background: #fff;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0; visibility: hidden;
      transform: translateY(4px) scale(0.92);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0.3s;
    }
    .tooltip.ready {
      opacity: 1; visibility: visible;
      transform: translateY(0) scale(1);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0s;
    }
    .tooltip.hidden { opacity: 0; visibility: hidden; transform: translateY(4px) scale(0.92); }
    /* position: bubbleの反対側に配置（overlap を避けて 16px マージン） */
    .tooltip.right { right: calc(24px + var(--bubble-size, 60px) + 14px); }
    .tooltip.left  { left:  calc(24px + var(--bubble-size, 60px) + 14px); }

    /* Tooltip styles */
    .tooltip.style-speech {
      border-radius: 18px;
      box-shadow: 0 10px 26px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06);
    }
    .tooltip.style-speech::after {
      content: ''; position: absolute; top: 50%; width: 0; height: 0;
      border-style: solid; transform: translateY(-50%);
    }
    .tooltip.style-speech.right::after { right: -8px; border-width: 7px 0 7px 10px; border-color: transparent transparent transparent #fff; }
    .tooltip.style-speech.left::after  { left:  -8px; border-width: 7px 10px 7px 0; border-color: transparent #fff transparent transparent; }

    .tooltip.style-pill {
      border-radius: 999px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
    }

    .tooltip.style-card {
      border-radius: 12px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.08);
      padding: 12px 18px;
    }

    .tooltip.style-neon {
      border-radius: 999px;
      background: #fff;
      box-shadow:
        0 0 0 2px var(--color, #6366f1),
        0 0 18px 2px var(--color, #6366f1),
        0 0 32px rgba(99,102,241,0.35);
      color: var(--color, #6366f1);
    }

    .tooltip.style-minimal {
      background: transparent;
      border-bottom: 2px solid var(--color, #6366f1);
      border-radius: 0;
      padding: 6px 4px;
      color: var(--color, #6366f1);
      box-shadow: none;
      font-weight: 800;
    }

    /* Main panel */
    .panel {
      position: fixed; bottom: calc(var(--bubble-offset-y, 24px) + 76px); width: 400px; max-width: calc(100vw - 32px);
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
    .panel.right { right: var(--bubble-offset-x, 24px); transform-origin: bottom right; }
    .panel.left { left: var(--bubble-offset-x, 24px); transform-origin: bottom left; }

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
      padding: 12px 16px; font-size: 13.5px; line-height: 1.6;
      white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal;
      font-weight: 500;
      width: fit-content; max-width: 100%;
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
      .panel {
        top: 0; bottom: 0; right: 0; left: 0;
        width: 100%; max-width: 100%;
        /* 100vh は URL バー含む高さで上下が切れるため、
           dvh (dynamic viewport height) を使用。古いブラウザは vh にフォールバック */
        height: 100vh;
        height: 100dvh;
        max-height: 100vh;
        max-height: 100dvh;
        border-radius: 0;
        /* ノッチ/セーフエリア対応 (iOS) */
        padding-top: env(safe-area-inset-top, 0);
        padding-bottom: env(safe-area-inset-bottom, 0);
        box-sizing: border-box;
      }
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

  var tooltip = document.createElement('div');
  tooltip.className = 'tooltip right style-speech';
  shadow.appendChild(tooltip);

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
    var bubbleSize = appearance.bubbleSize === 'small' ? '48px'
      : appearance.bubbleSize === 'large' ? '72px' : '60px';
    // 位置オフセット (px)。未指定/不正値は既定 24px。0〜400 にクランプ
    var clampPx = function (v, def) {
      var n = Number(v);
      if (!isFinite(n)) return def;
      return Math.max(0, Math.min(400, n));
    };
    var offsetX = clampPx(appearance.bubbleOffsetX, 24);
    var offsetY = clampPx(appearance.bubbleOffsetY, 24);
    var animation = appearance.bubbleAnimation || 'none';
    var tooltipText = typeof appearance.bubbleTooltipText === 'string' ? appearance.bubbleTooltipText : 'AIに相談する';
    var tooltipStyle = appearance.bubbleTooltipStyle || 'speech';

    panel.style.setProperty('--color', color);
    panel.style.setProperty('--bubble-bg', bubbleBg);
    bubble.style.setProperty('--color', color);
    bubble.style.setProperty('--bubble-bg', bubbleBg);
    bubble.style.setProperty('--bubble-radius', bubbleRadius);
    bubble.style.setProperty('--bubble-size', bubbleSize);
    bubble.style.setProperty('--bubble-offset-x', offsetX + 'px');
    bubble.style.setProperty('--bubble-offset-y', offsetY + 'px');
    panel.style.setProperty('--bubble-offset-x', offsetX + 'px');
    panel.style.setProperty('--bubble-offset-y', offsetY + 'px');
    tooltip.style.setProperty('--color', color);
    tooltip.style.setProperty('--bubble-size', bubbleSize);
    // position (left/right) のみ更新。ready / hidden / open クラスは init と togglePanel が管理
    bubble.classList.remove('left', 'right', 'anim-pulse', 'anim-wobble', 'anim-bounce', 'anim-shimmer');
    bubble.classList.add(position);
    if (animation && animation !== 'none') bubble.classList.add('anim-' + animation);
    panel.classList.remove('left', 'right');
    panel.classList.add(position);
    // tooltip の位置・スタイル・テキスト
    tooltip.classList.remove('left', 'right', 'style-speech', 'style-pill', 'style-card', 'style-neon', 'style-minimal');
    tooltip.classList.add(position);
    tooltip.classList.add('style-' + tooltipStyle);
    tooltip.textContent = tooltipText;
    // 空文字なら tooltip を表示しない（visibility: hidden に）
    if (!tooltipText) {
      tooltip.classList.remove('ready');
      tooltip.classList.add('hidden');
    }
    bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' + iconPath + '"/></svg>';

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
      // IME変換中のEnterは送信しない (バニラJSなので e.isComposing / keyCode 229 を直接見る)
      if (e.key !== 'Enter') return;
      if (e.isComposing || e.keyCode === 229) return;
      if (input.value.trim()) sendMessage(input.value.trim());
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
    bubbleWrap.style.flex = '1 1 auto';
    bubbleWrap.style.minWidth = '0';
    bubbleWrap.style.maxWidth = 'calc(100% - 38px)';
    bubbleWrap.style.alignItems = m.role === 'visitor' ? 'flex-end' : 'flex-start';
    bubbleWrap.style.gap = '6px';

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
          // フィールド名に応じて入力タイプを決定
          if (f.field === 'email') inp.type = 'email';
          else if (f.field === 'phone') inp.type = 'tel';
          else if (/time|datetime|希望/.test(f.field) || /日時/.test(f.label || '')) inp.type = 'datetime-local';
          else if (/date|日付/.test(f.field) || /日付/.test(f.label || '')) inp.type = 'date';
          else inp.type = 'text';
          inp.addEventListener('input', function (e) { leadData[f.field] = e.target.value; });
          form.appendChild(lab);
          form.appendChild(inp);
        });
        var sub = document.createElement('button');
        sub.textContent = '送信する';
        var ctx = m.ui.context || null; // 'meeting' | 'inquiry' | 'reservation' | null
        sub.addEventListener('click', function () {
          // closedAction: meeting / inquiry / reservation / null (既存どおり)
          submitLead(leadData, ctx);
          var doneMsg;
          if (ctx === 'meeting') doneMsg = '送信完了。続けて日時選択にお進みください！';
          else if (ctx === 'inquiry' || ctx === 'reservation') doneMsg = '送信しました。担当者よりご連絡いたします。ありがとうございました！';
          else doneMsg = '送信しました。ありがとうございます！';
          form.innerHTML = '<div style="text-align:center;color:#10b981;font-weight:bold;">' + doneMsg + '</div>';
          if (ctx === 'meeting') {
            // AI に「リード送信完了」を伝えて次のステップ (meeting_calendar) を引き出す
            setTimeout(function () { sendMessage('送信しました。日時選択をお願いします。'); }, 400);
          }
        });
        form.appendChild(sub);
        bubbleWrap.appendChild(form);
      } else if (m.ui.type === 'meeting_proposal') {
        var proposalWrap = document.createElement('div');
        proposalWrap.className = 'nurture-opts';
        var acceptBtn = document.createElement('button');
        acceptBtn.className = 'cta-btn';
        acceptBtn.style.marginTop = '0';
        acceptBtn.textContent = m.ui.acceptLabel || 'はい、お願いします';
        acceptBtn.addEventListener('click', function () {
          sendMessage(m.ui.acceptLabel || 'はい、お願いします');
        });
        var declineBtn = document.createElement('button');
        declineBtn.className = 'cta-btn';
        declineBtn.style.cssText = 'background:rgba(255,255,255,0.6);color:#475569;border:1px solid rgba(255,255,255,0.9);box-shadow:4px 4px 12px rgba(163,177,198,0.3), -2px -2px 8px rgba(255,255,255,0.9);margin-top:8px;';
        declineBtn.textContent = m.ui.declineLabel || 'もう少し考える';
        declineBtn.addEventListener('click', function () {
          sendMessage(m.ui.declineLabel || 'もう少し考える');
        });
        proposalWrap.appendChild(acceptBtn);
        proposalWrap.appendChild(declineBtn);
        bubbleWrap.appendChild(proposalWrap);
      } else if (m.ui.type === 'meeting_calendar' && m.ui.url) {
        var calBtn = document.createElement('a');
        calBtn.className = 'cta-btn';
        calBtn.setAttribute('href', m.ui.url);
        calBtn.setAttribute('target', '_blank');
        calBtn.setAttribute('rel', 'noopener noreferrer');
        calBtn.textContent = m.ui.buttonLabel || '日時を選ぶ';
        calBtn.addEventListener('click', function () {
          submitLead({}, 'meeting');
        });
        bubbleWrap.appendChild(calBtn);
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
        tooltip.classList.add('hidden');
      });
    } else {
      panel.classList.remove('open');
      bubble.classList.remove('hidden');
      if (tooltip.textContent) tooltip.classList.remove('hidden');
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
      demo: isDemo ? 1 : 0,
    }).then(function (res) {
      if (res && res.success) {
        state.sessionId = res.sessionId;
        state.messages.push({ role: 'bot', content: res.reply, ui: res.ui });
      } else {
        // サーバーがユーザー向け文言（レート制限等）を返した場合はそれを表示
        var msg = (res && res.error) ? res.error : 'すみません、エラーが発生しました。';
        state.messages.push({ role: 'bot', content: msg });
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
  apiGet('/api/bot/config?id=' + paletteId + (isDemo ? '&demo=1' : '')).then(function (res) {
    if (!res || !res.success) {
      if (res && res.reason === 'plan_required') {
        console.info('[palette-bot] Palette AIX plan required for paletteId=' + paletteId);
      } else if (res && res.reason === 'suspended') {
        console.info('[palette-bot] bot suspended for paletteId=' + paletteId);
      } else {
        console.warn('[palette-bot] config load failed:', res && res.error);
      }
      // 契約なし or エラー時はバブルを表示しない
      host.remove();
      return;
    }
    // showPages: 'top' の場合、TOPページ以外では表示しない
    var showPages = res.config && res.config.appearance && res.config.appearance.showPages;
    if (showPages === 'top') {
      var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
      var isTop = path === '/' || path === '/index.html' || path === '/index.htm' || path === '/index';
      if (!isTop) { host.remove(); return; }
    }
    state.config = res.config;
    var delay = Number((res.config && res.config.appearance && res.config.appearance.welcomeDelay) || 0) || 0;
    var autoOpen = !!(res.config && res.config.appearance && res.config.appearance.autoOpen);
    setTimeout(function () {
      render();
      // 初回render直後にバブルと吹き出しをフワッと登場させる
      requestAnimationFrame(function () {
        bubble.classList.add('ready');
        if (tooltip.textContent) tooltip.classList.add('ready');
        // autoOpen=true なら、登場アニメ後に自動でパネルを開く
        if (autoOpen && !state.open) {
          // バブル登場のフワッとアニメ後、少し間を置いてから開く（自然に見せる）
          setTimeout(togglePanel, 600);
        }
      });
    }, delay * 1000);
  }).catch(function (err) {
    console.warn('[palette-bot] init error:', err);
    host.remove();
  });
})();
