/**
 * BrowserAction 桥接模块（仅右侧系统使用）
 *
 * 注入（右 → 左）:
 *   BrowserAction("sgBrowserExcuteJsCodeByArea", leftSystemUrl, jsCode, "show")
 *
 * 回传（左 → 右）:
 *   __prototype__("sgBrowserExcuteJsCode", rightSystemUrl,
 *     `window.callbackNameUseInfo(${JSON.stringify(objInfo)})`)
 *
 * 接收（右侧）:
 *   window.parent.callbackNameUseInfo = (text) => { ... }
 *
 * 当宿主缺少 BrowserAction / __prototype__ 时，自动进入 mock 模式，
 * 持续推送模拟悬停数据，便于本地演示。
 */

const CALLBACK_NAME = 'callbackNameUseInfo'
const INSPECT_FLAG = '__sgDomInspectActive'
const HIGHLIGHT_ID = '__sgDomInspectHighlight'

/** @type {Set<(info: object|null, meta?: { mock?: boolean }) => void>} */
const listeners = new Set()

/** @type {ReturnType<typeof setInterval>|null} */
let mockTimer = null

/** @type {boolean} */
let inspecting = false

/** @type {{ leftSystemUrl: string, rightSystemUrl: string }|null} */
let lastConfig = null

function getHostWindow() {
  try {
    if (window.parent && window.parent !== window) return window.parent
  } catch {
    /* cross-origin parent — fall back to self */
  }
  return window
}

function hasBrowserAction() {
  return typeof window.BrowserAction === 'function'
}

function isMockMode() {
  return !hasBrowserAction()
}

/**
 * 构建注入到左侧页面的 jsCode 字符串。
 * 在左侧 mouseover 时采集元素信息，经 __prototype__ 回传到右侧。
 */
export function buildInjectedJsCode(rightSystemUrl, options = {}) {
  const throttleMs = Number(options.throttleMs) || 80
  const maxHtml = Number(options.maxOuterHtml) || 800
  const rightUrl = JSON.stringify(String(rightSystemUrl || ''))
  const flag = JSON.stringify(INSPECT_FLAG)
  const highlightId = JSON.stringify(HIGHLIGHT_ID)

  return `
(function(){
  try {
    if (window[${flag}]) {
      try { window[${flag}](); } catch (e) {}
    }
    var RIGHT_URL = ${rightUrl};
    var THROTTLE = ${throttleMs};
    var MAX_HTML = ${maxHtml};
    var lastTs = 0;
    var lastEl = null;
    var highlight = document.getElementById(${highlightId});
    if (!highlight) {
      highlight = document.createElement('div');
      highlight.id = ${highlightId};
      highlight.setAttribute('data-sg-ignore', '1');
      highlight.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #67C23A;background:rgba(103,194,58,0.12);box-sizing:border-box;display:none;';
      (document.documentElement || document.body).appendChild(highlight);
    }
    function cssPath(el) {
      if (!el || el.nodeType !== 1) return '';
      var parts = [];
      var cur = el;
      while (cur && cur.nodeType === 1 && parts.length < 12) {
        var name = (cur.tagName || '').toLowerCase();
        if (cur.id) {
          parts.unshift(name + '#' + cur.id);
          break;
        }
        var parent = cur.parentElement;
        if (parent) {
          var siblings = parent.children;
          var same = 0, index = 0;
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i].tagName === cur.tagName) {
              same++;
              if (siblings[i] === cur) index = same;
            }
          }
          if (same > 1) name += ':nth-of-type(' + index + ')';
        }
        parts.unshift(name);
        cur = parent;
      }
      return parts.join(' > ');
    }
    function ancestors(el) {
      var list = [];
      var cur = el;
      var depth = 0;
      while (cur && cur.nodeType === 1 && depth < 16) {
        list.push({
          tag: (cur.tagName || '').toLowerCase(),
          id: cur.id || '',
          className: typeof cur.className === 'string' ? cur.className : ''
        });
        cur = cur.parentElement;
        depth++;
      }
      return list;
    }
    function attrs(el) {
      var out = {};
      if (!el || !el.attributes) return out;
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        out[a.name] = a.value;
      }
      return out;
    }
    function collect(el) {
      var rect = el.getBoundingClientRect();
      var classList = [];
      try { classList = Array.prototype.slice.call(el.classList || []); } catch (e) {}
      var html = '';
      try {
        html = el.outerHTML || '';
        if (html.length > MAX_HTML) html = html.slice(0, MAX_HTML) + '...';
      } catch (e) {}
      return {
        id: el.id || '',
        tag: (el.tagName || '').toLowerCase(),
        classList: classList,
        className: typeof el.className === 'string' ? el.className : classList.join(' '),
        path: cssPath(el),
        ancestors: ancestors(el),
        attributes: attrs(el),
        outerHTML: html,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          bottom: Math.round(rect.bottom),
          right: Math.round(rect.right)
        },
        text: ((el.innerText || el.textContent || '') + '').trim().slice(0, 120),
        href: el.href || '',
        ts: Date.now()
      };
    }
    function send(info) {
      if (typeof __prototype__ !== 'function') return;
      try {
        __prototype__(
          'sgBrowserExcuteJsCode',
          RIGHT_URL,
          'window.${CALLBACK_NAME}(' + JSON.stringify(info) + ')'
        );
      } catch (e) {}
    }
    function onMove(ev) {
      var el = ev.target;
      if (!el || el.nodeType !== 1) return;
      if (el.id === ${highlightId} || el.getAttribute('data-sg-ignore') === '1') return;
      var now = Date.now();
      if (el === lastEl && now - lastTs < THROTTLE) return;
      if (now - lastTs < THROTTLE && el === lastEl) return;
      lastTs = now;
      lastEl = el;
      var r = el.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.top = r.top + 'px';
      highlight.style.left = r.left + 'px';
      highlight.style.width = Math.max(0, r.width) + 'px';
      highlight.style.height = Math.max(0, r.height) + 'px';
      send(collect(el));
    }
    function onLeave() {
      highlight.style.display = 'none';
    }
    document.addEventListener('mouseover', onMove, true);
    document.addEventListener('mouseout', onLeave, true);
    window[${flag}] = function stop() {
      document.removeEventListener('mouseover', onMove, true);
      document.removeEventListener('mouseout', onLeave, true);
      if (highlight && highlight.parentNode) highlight.parentNode.removeChild(highlight);
      try { delete window[${flag}]; } catch (e) { window[${flag}] = null; }
    };
  } catch (err) {
    try { console.error('[sg-dom-inspect]', err); } catch (e) {}
  }
})();
`.trim()
}

function buildStopJsCode() {
  const flag = JSON.stringify(INSPECT_FLAG)
  return `
(function(){
  try {
    if (typeof window[${flag}] === 'function') window[${flag}]();
  } catch (e) {}
})();
`.trim()
}

function notify(info, meta) {
  listeners.forEach((fn) => {
    try {
      fn(info, meta)
    } catch (e) {
      console.error('[bridge] listener error', e)
    }
  })
}

/**
 * 注册悬停元素信息回调（持续流，非一次性）。
 * @param {(info: object|null, meta?: { mock?: boolean }) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onElementInfo(handler) {
  if (typeof handler !== 'function') return () => {}
  listeners.add(handler)
  return () => listeners.delete(handler)
}

/**
 * 在 window.parent 上挂载回调，供左侧 __prototype__ 回传调用。
 * 持续更新；同时支持一次性 Promise（getUserInfo 风格）。
 */
export function installCallbackReceiver() {
  const host = getHostWindow()
  host[CALLBACK_NAME] = (payload) => {
    let info = payload
    if (typeof payload === 'string') {
      try {
        info = JSON.parse(payload)
      } catch {
        info = { raw: payload }
      }
    }
    notify(info, { mock: false })
    return info
  }
  // 部分宿主只挂在当前 window
  if (host !== window) {
    window[CALLBACK_NAME] = host[CALLBACK_NAME]
  }
  return host[CALLBACK_NAME]
}

/**
 * Promise 风格一次性等待（类似用户环境 getUserInfo 示例）。
 * 悬停场景请用 onElementInfo 持续监听。
 */
export function waitForElementInfo(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const host = getHostWindow()
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('waitForElementInfo timeout'))
    }, timeoutMs)

    const prev = host[CALLBACK_NAME]
    const once = (payload) => {
      let info = payload
      if (typeof payload === 'string') {
        try {
          info = JSON.parse(payload)
        } catch {
          info = { raw: payload }
        }
      }
      cleanup()
      notify(info, { mock: false })
      resolve(info)
    }

    function cleanup() {
      clearTimeout(timer)
      host[CALLBACK_NAME] = prev || host[CALLBACK_NAME]
    }

    host[CALLBACK_NAME] = once
    if (host !== window) window[CALLBACK_NAME] = once
  })
}

function callBrowserAction(leftSystemUrl, jsCode) {
  if (!hasBrowserAction()) {
    throw new Error('BrowserAction is not available in this environment')
  }
  window.BrowserAction(
    'sgBrowserExcuteJsCodeByArea',
    leftSystemUrl,
    jsCode,
    'show'
  )
}

const MOCK_SAMPLES = [
  {
    id: 'nav-home',
    tag: 'a',
    classList: ['menu-item', 'active'],
    className: 'menu-item active',
    path: 'div#app > nav.sidebar > ul > li:nth-of-type(1) > a#nav-home',
    ancestors: [
      { tag: 'a', id: 'nav-home', className: 'menu-item active' },
      { tag: 'li', id: '', className: '' },
      { tag: 'ul', id: '', className: 'menu-list' },
      { tag: 'nav', id: '', className: 'sidebar' },
      { tag: 'div', id: 'app', className: '' },
    ],
    attributes: { id: 'nav-home', class: 'menu-item active', href: '/home' },
    outerHTML: '<a id="nav-home" class="menu-item active" href="/home">首页</a>',
    rect: { x: 24, y: 120, width: 180, height: 40, top: 120, left: 24, bottom: 160, right: 204 },
    text: '首页',
    href: '/home',
  },
  {
    id: 'btn-submit',
    tag: 'button',
    classList: ['el-button', 'el-button--primary'],
    className: 'el-button el-button--primary',
    path: 'div#app > main > form > div.actions > button#btn-submit',
    ancestors: [
      { tag: 'button', id: 'btn-submit', className: 'el-button el-button--primary' },
      { tag: 'div', id: '', className: 'actions' },
      { tag: 'form', id: '', className: '' },
      { tag: 'main', id: '', className: '' },
      { tag: 'div', id: 'app', className: '' },
    ],
    attributes: { id: 'btn-submit', class: 'el-button el-button--primary', type: 'button' },
    outerHTML: '<button id="btn-submit" type="button" class="el-button el-button--primary">提交</button>',
    rect: { x: 420, y: 360, width: 96, height: 36, top: 360, left: 420, bottom: 396, right: 516 },
    text: '提交',
    href: '',
  },
  {
    id: '',
    tag: 'td',
    classList: ['cell', 'col-name'],
    className: 'cell col-name',
    path: 'table.data-table > tbody > tr:nth-of-type(3) > td.col-name',
    ancestors: [
      { tag: 'td', id: '', className: 'cell col-name' },
      { tag: 'tr', id: '', className: '' },
      { tag: 'tbody', id: '', className: '' },
      { tag: 'table', id: '', className: 'data-table' },
    ],
    attributes: { class: 'cell col-name', 'data-row': '3' },
    outerHTML: '<td class="cell col-name" data-row="3">张三</td>',
    rect: { x: 200, y: 480, width: 140, height: 32, top: 480, left: 200, bottom: 512, right: 340 },
    text: '张三',
    href: '',
  },
  {
    id: 'chart-region',
    tag: 'div',
    classList: ['chart-card', 'shadow'],
    className: 'chart-card shadow',
    path: 'div#app > section.dashboard > div#chart-region',
    ancestors: [
      { tag: 'div', id: 'chart-region', className: 'chart-card shadow' },
      { tag: 'section', id: '', className: 'dashboard' },
      { tag: 'div', id: 'app', className: '' },
    ],
    attributes: { id: 'chart-region', class: 'chart-card shadow', role: 'img' },
    outerHTML: '<div id="chart-region" class="chart-card shadow" role="img">...</div>',
    rect: { x: 260, y: 80, width: 320, height: 200, top: 80, left: 260, bottom: 280, right: 580 },
    text: '区域排名图表',
    href: '',
  },
]

function startMockStream() {
  stopMockStream()
  let i = 0
  const push = () => {
    const sample = { ...MOCK_SAMPLES[i % MOCK_SAMPLES.length], ts: Date.now() }
    i += 1
    notify(sample, { mock: true })
  }
  push()
  mockTimer = setInterval(push, 1600)
}

function stopMockStream() {
  if (mockTimer) {
    clearInterval(mockTimer)
    mockTimer = null
  }
}

/**
 * 开始检查：向左侧注入悬停采集脚本，并在右侧注册持续回调。
 * @param {{ leftSystemUrl: string, rightSystemUrl: string, forceMock?: boolean }} config
 */
export function startInspect(config = {}) {
  const leftSystemUrl = String(config.leftSystemUrl || '').trim()
  const rightSystemUrl = String(config.rightSystemUrl || '').trim()
  lastConfig = { leftSystemUrl, rightSystemUrl }

  installCallbackReceiver()
  inspecting = true

  const useMock = config.forceMock === true || isMockMode()

  if (useMock) {
    startMockStream()
    return {
      mode: 'mock',
      message: hasBrowserAction()
        ? 'forceMock=true，使用本地模拟悬停流'
        : '未检测到 BrowserAction，已启用 mock 悬停流',
    }
  }

  if (!leftSystemUrl) {
    throw new Error('leftSystemUrl（原系统链接）不能为空')
  }
  if (!rightSystemUrl) {
    throw new Error('rightSystemUrl（右边系统链接）不能为空')
  }

  const jsCode = buildInjectedJsCode(rightSystemUrl)
  callBrowserAction(leftSystemUrl, jsCode)

  return {
    mode: 'bridge',
    message: '已通过 BrowserAction 向左侧注入悬停检查脚本',
  }
}

/**
 * 停止检查：向左侧注入清理脚本，并停止 mock 流。
 */
export function stopInspect(config = {}) {
  inspecting = false
  stopMockStream()

  const leftSystemUrl = String(
    (config.leftSystemUrl || lastConfig?.leftSystemUrl || '')
  ).trim()

  if (hasBrowserAction() && leftSystemUrl && config.forceMock !== true) {
    try {
      callBrowserAction(leftSystemUrl, buildStopJsCode())
    } catch (e) {
      console.warn('[bridge] stop inject failed', e)
    }
  }

  return { ok: true }
}

export function getBridgeStatus() {
  return {
    inspecting,
    hasBrowserAction: hasBrowserAction(),
    mockMode: isMockMode(),
    callbackName: CALLBACK_NAME,
    lastConfig,
  }
}

export default {
  startInspect,
  stopInspect,
  buildInjectedJsCode,
  onElementInfo,
  installCallbackReceiver,
  waitForElementInfo,
  getBridgeStatus,
}
