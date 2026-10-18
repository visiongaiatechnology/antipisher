<div align="center">

# 🛡️ Antipisher 0.2.1 (Alpha)

**适用于 Google Chrome 与 Mozilla Firefox 的离线高精度反网络钓鱼、IDN 同形字与拼写抢注（Typosquatting）防护扩展**  
*遵循 GNU Affero 通用公共许可证 v3.0 (AGPLv3) 开源*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](LICENSE)
[![Version: 0.2.1-alpha](https://img.shields.io/badge/Version-0.2.1--alpha-10b981.svg?style=for-the-badge)](https://github.com/visiongaiatechnology/antipisher)
[![Tests: 69/69 Passing](https://img.shields.io/badge/Tests-69%2F69_Passing-2ea043.svg?style=for-the-badge)](#测试与开发规范)
[![Telemetry: Zero / 100% Offline](https://img.shields.io/badge/遥测-零_%2F_100%25_离线-0284c7.svg?style=for-the-badge)](#隐私保护与离线保证)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3_就绪-f59e0b.svg?style=for-the-badge)](chrome/)
[![Firefox MV3](https://img.shields.io/badge/Firefox-MV3_就绪-ef4444.svg?style=for-the-badge)](firefox/)

---

### 🌐 Select Language / Sprache wählen / Выберите язык / 选择语言

[🇬🇧 **English**](README.md) &nbsp;•&nbsp; [🇩🇪 **Deutsch**](README.de.md) &nbsp;•&nbsp; [🇷🇺 **Русский**](README.ru.md) &nbsp;•&nbsp; [🇨🇳 **中文**](README.zh.md)

---

</div>

> **状态：** `SILVER` · 版本 `0.2.1` · 截至 2026-10-18 · AEGIS 追踪器防护与设置面板里程碑版本。  
> **非最终应用商店发行版：** 浏览器自动化端到端测试（E2E）、应用商店官方上架审核、签名更新分发流与完整的 V2 图引擎正在持续演进中（详见 [已知边界与限制](#已知边界与限制)）。

---

## ⚡ 核心能力与已实现特性

- **独立设置控制面板与自定义白名单：** 具备完整的选项设置中心（`options.html`），可直接通过弹出菜单齿轮按钮或扩展管理面板进入。支持切换标准/严格模式、安全提示气泡、角标计数、首选语言，并可在本地管理自定义域名白名单（无需联网、即时跳过检测）。
- **AEGIS Tracker Shield（灵感源自 uBlock 的纯本地防护）：** 纯本地声明式网络规则拦截（`rulesets/trackers.json`）与针对 `ga`、`dataLayer`、`fbq`、`ttq`、`clarity`、`hj` 及 `navigator.sendBeacon` 的动态脚本替代替身（Surrogates），在彻底阻断商业追踪遥测的同时确保在线结账与登录永不卡顿挂起。自动净化 URL 追踪查询参数（`utm_*`、`fbclid`、`gclid`）。
- **实时动态追踪器计数器：** 浏览器工具栏图标角标与弹出菜单实时展示拦截数字（`标签页: X · 总计: Y`），精准追踪包括动态与延迟加载在内的第三方追踪脚本。
- **GeDefense Light DOM 超级卫士：** 控制台防社工钓鱼 Self-XSS 警示横幅、认知快速通道零开销 HTML 过滤净化、内联脚本与 iframe 恶意注入中和，以及原型链层面的 `javascript:` 伪协议执行拦截。
- **AEGIS 反指纹追踪（Anti-Fingerprinting）：** 屏幕几何尺寸混淆与微幅 Canvas 1-bit 噪声注入，有效抵御跨站浏览器指纹追踪。
- **静默安全浏览与 Glass 2100 状态提示气泡：** 干净、安全的正常网站直接即时加载（0 ms 额外延迟），彻底消除全屏拦截闪烁打扰。访问已验证网站时，屏幕右上角会短暂浮现轻盈雅致的微晶毛玻璃状态胶囊（*“域名已验证 · Antipisher”*），并自动淡出，且完全不阻碍网页鼠标点击（`pointer-events: none`）。
- **标准模式与严格预检模式自由切换：** 默认标准模式提供无感顺畅的日常直达体验与精准钓鱼拦截；严格模式可为高风险安全需求者开启针对每一个 GET 导航的全屏预检关卡。
- **多语言原生支持（4 种语言）：** 界面与检测原因全面支持**中文 (`zh`)**、**英语 (`en`)**、**德语 (`de`)** 和**俄语 (`ru`)**。扩展会自动根据浏览器首选语言设定默认显示，并支持随时手动切换。
- **187 个严选知名品牌 / 353 个官方根域名：** 覆盖顶级金融机构、政府政务、加密货币交易平台、云与 AI 基础设施、物流快递及国际互联网巨头，详见 [`shared/sites.js`](shared/sites.js) / `sites-100.json`。
- **共享托管命名空间隔离：** 严格隔离公共后缀与多租户平台域名（`force.com`、`github.io`、`vercel.app`、`netlify.app`、`wordpress.com` 等），绝不将其直接作为品牌根域名放行。例如：`paypal.force.com` 或 `paypal.github.io` 会被精确拦截，而真正的官方平台则正常访问。
- **启发式检测核心引擎：**
  - **Damerau-Levenshtein 1 & 2 距离：** 拦截相邻字符移位与拼写变体（`amzaon.com`、`goolge.com`、`paypla.com`）。
  - **单比特位翻转攻击（`isBitFlip`）：** 识别由硬件辐射或 DNS 内存传输引发的单比特位跳变（`amaxon.com` → Amazon、`microsmft.com` → Microsoft、`gongle.com` → Google）。
  - **视觉连字与形态替换：** 发现视觉孪生字符（`arnazon.com` 的 `rn→m`、`rnicrosoft.com`、`vv→w`、`cl→d`）。
  - **Unicode 国际化同形异义与变音符号：** 精准识别西里尔字母、希腊字母、带圈字符和拉丁变音符号（`páypal.com`、`päypal.com`、`mïcrosoft.com`、`amazön.com`），同时避免误报合法的本土词汇（如 `über.de`）。
  - **双向文字控制字符欺骗（UTS #39 / RFC 8264）：** 拦截不可见的 RTL/LTR 控制符（`\u202E`、`\u202A`–`\u202E`、`\u2066`–`\u2069`）。
  - **品牌与凭据关键词组合词欺诈：** 拦截未经分割的钓鱼组合域名（`paypalsupport.com`、`binancelogin.com`、`paypal-rechnung.com`、`dhl-sendung.de`、`sparkasse-kontoauszug.de`）。
  - **子域名伪装利用：** 拦截将知名品牌伪装为第三方域名子域的行为（`apple.attacker.com`、`paypal.evil.test`）。
  - **RFC 3986 用户信息字段欺诈：** 拦截带有欺骗性凭据前缀的 URL 结构（`https://paypal.com@evil.com/`）。
- **第 3 层：URL 路径与查询参数深度审查：** 识别在第三方外链主机的 URL 路径中针对品牌的钓鱼诱导（如 `https://unrelated.com/paypal/login`、`https://phish-host.org/paypal.com/verify`），同时放行合法的开发者文档、API 教程与新闻科技报道（`/docs/`、`/news/`、`/blog/`）。
- **官方国家顶级域名（ccTLD）智能识别：** 正确放行跨国品牌的合法分支机构（`google.co.jp`、`amazon.se`、`ing.nl`、`visa.de`）；对歧义国家后缀给出提示性安全警报，对可疑通用顶级域名（gTLD）执行严格拦截。
- **页面内嵌防护盾（`shared/shield-content.js`）：**
  - 填补 Chrome MV3 declarativeNetRequest (DNR) 机制无法拦截 POST 表单提交的安全真空。
  - 在 DOM 捕获阶段（Capture Phase）拦截表单提交事件，确保敏感凭据不会离开浏览器。
  - 在封闭的 Shadow DOM（`attachShadow({ mode: 'closed' })`）中渲染防篡改的 Glass 2100 警告模态框，彻底免疫目标网页的 CSS 重置与 JavaScript 恶意篡改。
  - 在可疑风险域名的密码输入框上自动显示不侵入式的安全警示徽章。
- **Firefox MV3 规范对接：** 为 `guard.html` 明确配置 `web_accessible_resources`，并在 manifest 中按 MDN 与 AMO 官方标准声明 `data_collection_permissions: {"required":["none"]}`。
- **Chrome MV3 预检与消除安全静默失效（Fail-Open）：** 通过 DNR 进行 GET 预检；若 DNR 发生系统性配置异常，Antipisher 会即时进入持久化降级状态并激活备用观察者模式，在弹出菜单中清晰告警，同时消除了任意 URL 长度截断风险。
- **Glass 2100 界面设计与无障碍访问（a11y）：** 共享设计令牌（`shared/design-tokens.css`），严格满足 WCAG-AA 级对比度标准，具备全键盘无障碍焦点轮廓指示、ARIA `alertdialog`、平滑动画抑制（prefers-reduced-motion）及高对比度系统色彩适配。
- **100% 确定性、位一致的可重现构建：** 通过 `build.py` 生成固定时间戳的确定性 ZIP 发行包，并在代码仓库根目录提供 [`SHA256SUMS.txt`](SHA256SUMS.txt) 校验清单。
- **零遥测与完全离线隐私保证：** 无外部网络调用、无远程 CDN 依赖、无需 API 密钥、绝不记录用户浏览历史。

---

## 📸 界面预览与屏幕截图

| 设置控制面板 (v0.2.1) | 自定义域名白名单 (v0.2.1) |
|:---:|:---:|
| ![设置面板](audit/verify/fix/screenshots/v2-options.png) | ![白名单管理](audit/verify/fix/screenshots/v2-options-whitelist.png) |

| 扩展程序弹出菜单 (v0.2.1) | 页面内嵌防护盾（表单提交拦截） |
|:---:|:---:|
| ![弹出菜单](audit/verify/fix/screenshots/v2-popup.png) | ![页面内嵌防护盾](audit/verify/fix/screenshots/v2-shield-modal.png) |

| 威胁精准拦截（全屏拦截页） | 歧义域名提醒（告警提示页） |
|:---:|:---:|
| ![威胁精准拦截](audit/verify/fix/screenshots/v2-guard-block.png) | ![告警提示页](audit/verify/fix/screenshots/v2-guard-warn.png) |

| 紧凑视口视图 (500px) | 移动端视图 (390px) |
|:---:|:---:|
| ![紧凑视口视图](audit/verify/fix/screenshots/v2-guard-compact.png) | ![移动端视图](audit/verify/fix/screenshots/v2-guard-mobile.png) |

---

## 📊 实测检测性能指标

| 评测测试集 | 基准测试结果 |
|---|---|
| 独立 296 例保留测试集（审核验证员） | **289/296 = 97.6%** 准确率；0/166 假阴性（漏报），7/121 假阳性（误报）（高置信度误报率仅 2/99 = 2.0%） |
| 全新未经标定的 44 例健全性校验集 | **42/44 = 95.5%**（在未收录的组合词 `tiktok-coin.com`、`ledger-live.com` 上出现 2 例漏报） |
| 公开 184 例 URL 审计测试集 | 183/184 检出（1 例漏报，0 例误报） |
| 主任审计员 66 例对抗性探针 | **0/26 误报（0%）**，**0/40 漏报（0%）** —— 100% 全数通过 |
| Node.js 单元与回归测试套件 | **69/69 全部通过（100%）** |

> [!NOTE]
> 以上数据基于实证测试，并不构成绝对零风险担保。在即将到来的 V2 版本中，将进一步引入完整的 UTS-39 机器对照表和基于图谱的品牌实体知识库。

---

## 🏛️ 浏览器架构对比

| 架构维度 | Google Chrome (MV3) | Mozilla Firefox (MV3) |
|---|---|---|
| **顶级 GET 导航拦截** | DNR 预检重定向 → 本地 `guard.html` 拦截页 → 启发式综合判定 | 请求发出前的同步 `webRequestBlocking` 实时拦截 |
| **POST / 表单提交拦截** | 页面内嵌防护盾（DOM 捕获阶段拦截 submit 事件） | 同步 `webRequestBlocking` + 页面内嵌防护盾双重防护 |
| **DNR 异常处理策略** | 弹出窗口显式展示“降级”状态并切换至备用观察模式 | 不适用（具备原生同步 `webRequestBlocking`） |
| **离线优先设计** | 是（100% 纯本地离线运行，零网络流量） | 是（100% 纯本地离线运行，零网络流量） |
| **浏览器端到端测试** | 加载已解压的扩展程序进行人工验证（受限 Chrome 155 CLI 限制） | 通过 `about:debugging` 页面进行人工加载验证 |

---

## 🔒 隐私保护与离线保证

- **零网络外联活动：** 绝不向任何外部服务器、云平台或数据分析接口发起请求。
- **纯本地存储：** 仅在本地持久化拦截计数器、配置项（`strictMode`）与语言偏好（`user_locale`）。
- **不持久化浏览历史：** 用户的访问记录不会被写入磁盘或上传。单次放行权限仅绑定至当前标签页与当前会话。
- **DOM 页面内嵌盾安全审计：** 在表单提交时仅读取目标 URL 及是否存在密码输入控件 —— **绝不读取、记录、拦截或存储任何输入的密码文本**。

---

## ⚠️ 已知边界与限制

1. **POST 防护盾覆盖范围：** 通过脚本直接调用 `form.submit()`（跳过 DOM 事件）、跨域嵌套 iframe 或底层 `fetch`/XHR 发起的异步请求无法被 DOM 监听器拦截。根据 Chrome 官方规范，MV3 DNR 当前仍然仅支持 GET 拦截。
2. **Chrome 全局重定向流程：** Chrome 下的 GET 请求需要跳转至本地拦截页，放行时依赖单次临时放行规则。
3. **品牌收录库范围：** 当前收录 187 个高价值品牌。未收录在知识库内的品牌暂不享受主动防护。
4. **长尾边缘场景：** 公共托管平台上的字典单词子域名或全新未记录的品牌变体（如 `tiktok-coin`）仍需持续扩充启发式词库。
5. **无云端热更新：** 品牌与特征库的更新随扩展版本一同发布。

---

## 🚀 安装与本地调试

Antipisher 当前通过 GitHub 以 **Alpha 发行版** 形式发布：

```bash
# 1. 从 GitHub Releases 下载发行包或在本地执行构建：
python build.py

# 2. 验证压缩包完整性：
# Windows 环境：
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
# Linux / macOS 环境：
bash scripts/verify-release.sh
```

### Google Chrome
1. 打开浏览器并访问 `chrome://extensions`。
2. 开启右上角的 **开发者模式**。
3. 点击 **加载已解压的扩展程序** 并选择 [`chrome/`](chrome/) 目录。

### Mozilla Firefox
1. 打开浏览器并访问 `about:debugging#/runtime/this-firefox`。
2. 点击 **临时加载附加组件…**。
3. 选择 [`firefox/manifest.json`](firefox/manifest.json) 文件。
*(若需在开发者模式之外永久安装，需通过 AMO 进行未公开签名；详见 [`docs/ALPHA-INSTALL.md`](docs/ALPHA-INSTALL.md))。*

---

## 🧪 测试与开发规范

Antipisher 内置无任何外部依赖的端到端自动化测试套件：

```bash
# 执行全部 38 个单元与回归测试用例
node --test tests/*.test.cjs

# 校验所有核心 JavaScript 文件语法
node --check shared/detector.js
node --check shared/shield-content.js
node --check shared/i18n.js
node --check chrome/background.js
node --check firefox/background.js

# 运行独立验证集合与对抗性探针
node audit/verify/holdout/run_holdout.cjs
node audit/verify/fix/fresh_sanity.cjs
node audit/lead/lead_probe.cjs

# 构建可重现的确定性发行压缩包
python build.py
```

---

## 📜 参考标准与技术规范

- **Unicode 国际化安全：** [Unicode Technical Standard #39 (UTS #39)](https://www.unicode.org/reports/tr39/)
- **Chrome 扩展开发：** [DeclarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- **Mozilla 附加组件：** [MDN webRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest)
- **公共后缀规范：** [Public Suffix List (PSL)](https://publicsuffix.org/)
- **应用商店安全政策：** [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

---

## 📄 许可证与版权信息

本项目采用 **GNU Affero 通用公共许可证 v3.0 (AGPLv3)** 开源。  
完整许可协议文本见 [`LICENSE`](LICENSE)。

Copyright © 2026 VisionGaiaTechnology. 保留所有权利。
