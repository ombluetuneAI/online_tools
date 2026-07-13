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

## 部署

本项目为纯静态网站，可直接部署到任意静态托管平台，无需构建步骤：

- [GitHub Pages](https://pages.github.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Vercel](https://vercel.com/) / [Netlify](https://www.netlify.com/)
- [Gitee Pages](https://gitee.com/help/articles/4136)（国内访问更友好）

将仓库根目录下的三个 HTML 文件上传或推送即可。

## 技术说明

- 单文件 HTML，CSS 与 JavaScript 内联，无第三方依赖
- 所有转换逻辑在浏览器端完成，数据不上传服务器
- 使用 `TextEncoder` / `TextDecoder`、`Intl.DateTimeFormat` 等现代 Web API

## 浏览器兼容

支持 Chrome、Firefox、Edge、Safari 等现代浏览器。复制功能依赖 `navigator.clipboard`，需在 HTTPS 或 `localhost` 环境下使用。
