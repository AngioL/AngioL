# Vue3 右侧 DOM 悬停检查器

仅右侧面板。左侧是第三方原系统，不改造其源码。通过宿主提供的 `BrowserAction` / `__prototype__` 桥接注入与回传。

## 快速开始

```bash
cd vue3-dom-inspector
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 `http://localhost:5173`）。

本地没有宿主 API 时会自动进入 **Mock 模式**：点击「开始检查」后面板会持续收到模拟悬停数据。

生产构建：

```bash
npm run build
npm run preview
```

## 环境变量

复制 `.env.example` 为 `.env`（可选）：

| 变量 | 说明 |
|------|------|
| `VITE_LEFT_SYSTEM_URL` | 原系统（左侧）链接，注入目标 |
| `VITE_RIGHT_SYSTEM_URL` | 本系统（右侧）链接，回传目标 |

也可在 UI「连接配置」中直接编辑。

## BrowserAction 注入如何工作

### 1. 右 → 左：注入悬停脚本

右侧调用宿主 API：

```js
BrowserAction(
  "sgBrowserExcuteJsCodeByArea",
  leftSystemUrl, // 原系统链接
  jsCode,        // 由 buildInjectedJsCode(rightSystemUrl) 生成
  "show"
)
```

`jsCode` 在左侧页面执行后会：

- 监听 `mouseover`（节流）
- 采集：`id`、`classList`、`tag`、DOM path / ancestors、attributes、截断 `outerHTML`、`rect`
- 在目标元素上画高亮框
- 通过 `__prototype__` 把数据送回右侧

### 2. 左 → 右：回传

注入脚本内调用：

```js
__prototype__(
  "sgBrowserExcuteJsCode",
  rightSystemUrl, // 右边系统的链接
  `window.callbackNameUseInfo(${JSON.stringify(objInfo)})`
)
```

### 3. 右侧接收（持续流）

```js
window.parent.callbackNameUseInfo = (text) => {
  // 解析并更新 UI —— 悬停过程中会反复触发
}
```

封装见 `src/bridge/browserAction.js`：

| API | 作用 |
|-----|------|
| `startInspect({ leftSystemUrl, rightSystemUrl, forceMock })` | 注册回调并注入 / 启动 mock |
| `stopInspect()` | 停止并清理左侧监听 |
| `buildInjectedJsCode(rightSystemUrl)` | 生成注入字符串 |
| `onElementInfo(handler)` | 订阅持续悬停推送 |
| `waitForElementInfo()` | Promise 一次性等待（类似宿主 getUserInfo 示例） |

**不要**把 `BroadcastChannel` 当作主通道；本项目以 `BrowserAction` 为主。

## 宿主环境必需 API

| API | 侧 | 用途 |
|-----|----|------|
| `BrowserAction(action, url, jsCode, mode)` | 右侧 | `sgBrowserExcuteJsCodeByArea` 向原系统区域执行 JS |
| `__prototype__(action, url, jsExpr)` | 左侧（注入代码内） | `sgBrowserExcuteJsCode` 在右侧执行回调表达式 |
| `window.parent.callbackNameUseInfo` | 右侧 | 接收回传对象 / JSON |

缺任一注入侧 API 时自动 Mock，便于离线演示。

## 目录

```
vue3-dom-inspector/
  src/
    bridge/browserAction.js   # 桥接封装
    components/
      ConfigPanel.vue         # URL / 启停
      ElementInfoPanel.vue    # DOM 字段展示
    App.vue
    main.js
```

## 嵌入宿主

将本应用作为右侧面板加载（iframe 或同壳页面均可）。确保：

1. 右侧能调用 `BrowserAction`
2. 左侧注入环境能调用 `__prototype__`
3. `leftSystemUrl` / `rightSystemUrl` 与宿主区域配置一致
