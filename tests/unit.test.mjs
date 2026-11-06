import { test } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Q = require("../qrcode-shared.js");

test("validateGenerateInput 空白", () => {
  const r = Q.validateGenerateInput("   ");
  assert.strictEqual(r.ok, false);
  assert.ok(r.error);
});

test("validateGenerateInput 超长", () => {
  const long = "诶".repeat(5000);
  const r = Q.validateGenerateInput(long, 100);
  assert.strictEqual(r.ok, false);
  assert.ok(r.error.includes("过长"));
});

test("validateGenerateInput 中文与 URL", () => {
  assert.strictEqual(Q.validateGenerateInput("你好 https://例.com").ok, true);
  assert.strictEqual(Q.validateGenerateInput("https://a.com/path?q=1").ok, true);
});

test("analyzeDecodedContent URL 与安全", () => {
  const u = Q.analyzeDecodedContent("  https://example.org/foo  ");
  assert.strictEqual(u.kind, "url");
  assert.strictEqual(u.hostname, "example.org");
  assert.ok(u.safeHref.startsWith("https://"));

  const bad = Q.analyzeDecodedContent("javascript:alert(1)");
  assert.strictEqual(bad.kind, "unsafe-scheme");
  assert.ok(bad.warning);
});

test("validateImageFile", () => {
  const big = { name: "a.png", size: Q.getMaxImageBytes() + 1, type: "image/png" };
  assert.strictEqual(Q.validateImageFile(big).ok, false);

  const txt = { name: "x.txt", size: 100, type: "text/plain" };
  assert.strictEqual(Q.validateImageFile(txt).ok, false);

  const ok = { name: "x.webp", size: 1024, type: "image/webp" };
  assert.strictEqual(Q.validateImageFile(ok).ok, true);
});

test("decodeQrFromImageData 无 jsQR", () => {
  assert.throws(() => Q.decodeQrFromImageData({ data: [], width: 1, height: 1 }, null));
});
