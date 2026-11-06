/**
 * 使用 puppeteer-core + 系统 Chrome 进行 E2E：生成、下载、识别真实 PNG 样本、Tab 与错误提示。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "test-output");
fs.mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const cands = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  for (const p of cands) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("未找到 Chrome/Chromium，请设置 PUPPETEER_EXECUTABLE_PATH");
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      const port = typeof a === "object" && a ? a.port : 0;
      s.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

function startStaticServer(rootDir, port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webmanifest": "application/manifest+json",
  };
  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      let p = decodeURIComponent(u.pathname);
      if (p === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (p === "/") p = "/qrcode.html";
      const file = path.join(rootDir, path.normalize(p).replace(/^(\.\.(\/|\\|$))+/, ""));
      if (!file.startsWith(rootDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      const ext = path.extname(file);
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const chromePath = findChrome();
  const port = await getFreePort();
  const server = await startStaticServer(root, port);
  const base = `http://127.0.0.1:${port}`;

  const samplePath = path.join(outDir, "e2e-sample-qr.png");
  const sampleUrl = "https://example.com/测试?q=你好&emoji=🙂";
  await QRCode.toFile(samplePath, sampleUrl, { type: "png", width: 256, margin: 2 });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const pageErrors = [];
  const consoleErrors = [];

  try {
    const page = await browser.newPage();

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // 桌面宽度
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.goto(`${base}/qrcode.html`, { waitUntil: "networkidle0", timeout: 60000 });

    await page.waitForFunction(() => typeof window.QrTool !== "undefined" && typeof window.jsQR === "function", { timeout: 30000 });

    const genInput = await page.$("#genInput");
    await genInput.click({ clickCount: 3 });
    await page.type("#genInput", "中文测试 https://例.com/路径 🔧");

    await page.click("#btnGenerate");
    await page.waitForFunction(
      () => {
        const c = document.querySelector("#qrCanvas");
        return c && c.width > 50 && c.height > 50;
      },
      { timeout: 10000 }
    );

    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: outDir,
    });
    await page.click("#btnGenDownload");
    await new Promise((r) => setTimeout(r, 800));
    let downloaded = [];
    for (let i = 0; i < 30; i++) {
      downloaded = fs.readdirSync(outDir).filter((f) => f.endsWith(".png") && f.startsWith("qrcode_"));
      if (downloaded.length) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!downloaded.length) {
      throw new Error("未检测到 PNG 下载文件");
    }

    // 空白生成
    await genInput.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.click("#btnGenerate");
    const errText = await page.$eval("#genMsg", (el) => el.textContent.trim());
    if (!errText) throw new Error("空白输入应显示错误提示");

    await page.click("#tabDecode");
    const fileInput = await page.$('input[type="file"]');

    const filePath = samplePath;
    await fileInput.uploadFile(filePath);

    await page.waitForFunction(
      () => {
        const m = document.querySelector("#decMsg");
        return m && m.textContent.includes("成功");
      },
      { timeout: 15000 }
    );

    const outBox = await page.$eval("#decOutput", (el) => el.textContent);
    if (!outBox.includes("example.com")) {
      throw new Error("识别结果应包含 example.com: " + outBox);
    }

    // 有效 PNG，但图中无二维码，应提示无法识别
    const invalidPng = path.join(outDir, "no-qr.png");
    fs.writeFileSync(
      invalidPng,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );

    await fileInput.uploadFile(invalidPng);
    await new Promise((r) => setTimeout(r, 500));
    const decErr = await page.$eval("#decMsg", (el) => el.textContent.trim());
    if (!decErr) throw new Error("损坏图应显示错误");

    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => typeof window.QrTool !== "undefined", { timeout: 30000 });
    await page.click("#tabDecode");
    await page.tap("#btnPickFile");
    const fi2 = await page.$('input[type="file"]');
    await fi2.uploadFile(filePath);
    await page.waitForFunction(
      () => document.querySelector("#decMsg") && document.querySelector("#decMsg").textContent.includes("成功"),
      { timeout: 15000 }
    );

    // 桌面 / 移动截图
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.goto(`${base}/qrcode.html`, { waitUntil: "networkidle0" });
    await page.screenshot({ path: path.join(outDir, "screenshot-desktop-1280.png"), fullPage: true });

    await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await page.screenshot({ path: path.join(outDir, "screenshot-mobile-390.png"), fullPage: true });

    if (pageErrors.length || consoleErrors.length) {
      throw new Error("页面错误: pageErrors=" + JSON.stringify(pageErrors) + " consoleErrors=" + JSON.stringify(consoleErrors));
    }

    console.log("E2E OK. Artifacts:", outDir);
    console.log("Sample QR:", samplePath);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
