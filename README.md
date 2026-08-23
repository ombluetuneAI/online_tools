# 在线工具

开发类实用小工具合集，纯静态页面，浏览器本地运行，无需后端与联网即可使用。

## 功能

| 工具 | 文件 | 说明 |
|------|------|------|
| 时间戳转换 | `timestamp.html` | Unix 时间戳与日期时间互转，支持多时区、秒/毫秒自动识别 |
| Hex 与文本互转 | `hex.html` | 十六进制与文本字符串互相转换，支持 UTF-8 / ASCII、大小写与分隔符 |

### 时间戳转换

- 实时显示当前 Unix 时间戳（秒），支持复制与暂停/继续
- 时间戳 → 日期时间：支持 10 位秒级与 13 位毫秒级输入
- 日期时间 → 时间戳：支持选择时区（默认 `Asia/Shanghai`）
- 内置 40+ 常用时区

### Hex 与文本互转

- 文本 → Hex：UTF-8 编码，可选大小写与分隔符（无 / 空格 / 冒号 / 连字符）
- Hex → 文本：自动忽略空格、冒号、连字符等分隔符，支持 UTF-8 与 ASCII/Latin-1

## 项目结构

```
tools/
├── index.html       # 首页，工具导航
├── timestamp.html   # 时间戳转换
├── hex.html         # Hex 与文本互转
└── README.md
```

## 本地使用

无需安装依赖或构建，任选一种方式打开即可：

**方式一：直接打开**

双击 `index.html`，或在浏览器中打开该文件。

**方式二：本地静态服务（推荐）**

```bash
# Python 3
python -m http.server 8080

# Node.js（需安装 npx）
npx serve .
```

然后访问 `http://localhost:8080`。

## 在线访问

本项目已通过 GitHub Pages 发布，可直接在浏览器打开：

- 首页：https://ombluetuneAI.github.io/online_tools/

## 账号密码管理器（password.html）

本地账号密码管理工具，支持明文密码与 TOTP 动态验证码，数据保存在浏览器 `localStorage`，不上传任何服务器。

### 导入 / 导出

- **导出**：点击「导出」选择格式与加密方式
  - 格式：**JSON 文件** 或 **二维码图片**（生成后可下载 PNG，容量约 2000 字符，数据过大时请使用 JSON 文件）；
  - 加密：**明文**（可直接读取）或 **加密**（AES-GCM + PBKDF2 派生密钥，文件名以 `_enc` / `_plain` 区分，二维码内容同样支持）。
- **导入 JSON**：选择文件后自动识别类型
  - 明文文件：直接解析并选择「合并 / 替换」导入；
  - 加密文件：自动弹出密码框，输入正确密码后解密再导入。
- **导入二维码**：上传二维码图片或摄像头扫码，内容与 JSON 导入同规则（明文直接导入，密文需输入密码）。
- **导入 TOTP 链接**：粘贴标准 `otpauth://totp/...` 链接，仅新增一条 TOTP 密钥，不影响密码库其它数据。

> 加密采用标准做法：密码仅存在于你的记忆中，遗忘后文件将无法解密，请妥善保管。

## 部署

本项目为纯静态网站，可直接部署到任意静态托管平台，无需构建步骤：

- [GitHub Pages](https://pages.github.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Vercel](https://vercel.com/) / [Netlify](https://www.netlify.com/)
- [Gitee Pages](https://gitee.com/help/articles/4136)（国内访问更友好）

将仓库根目录下的三个 HTML 文件上传或推送即可。若使用 GitHub Pages，在仓库 **Settings → Pages** 中选择 `master` 分支、根目录（`/root`）作为源即可，发布后访问 `https://<用户名>.github.io/online_tools/`。

## 技术说明

- 单文件 HTML，CSS 与 JavaScript 内联，无后端
- 二维码功能通过 CDN 引用 `qrcode-generator` 与 `jsQR` 库（MIT 协议），已锁定版本号
- 所有转换与加解密逻辑在浏览器端完成，账号数据不会上传任何服务器（CDN 仅用于加载公开的库代码）
- 使用 `TextEncoder` / `TextDecoder`、Web Crypto API（AES-GCM / PBKDF2）、`Intl.DateTimeFormat` 等现代 Web API

## 浏览器兼容

支持 Chrome、Firefox、Edge、Safari 等现代浏览器。复制功能依赖 `navigator.clipboard`，需在 HTTPS 或 `localhost` 环境下使用。
