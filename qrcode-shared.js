/**
 * 二维码工具共享逻辑（浏览器与 Node 单测共用）
 * 依赖：生成/解码页面上由 CDN 注入的全局 qrcode、jsQR（不在此文件加载）
 */
(function (global) {
  "use strict";

  /** 生成内容软上限（字节），超过时库也可能抛错，但先给出明确提示 */
  var MAX_QR_TEXT_BYTES = 2800;

  function getMaxQrTextBytes() {
    return MAX_QR_TEXT_BYTES;
  }

  function utf8ByteLength(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(String(text ?? "")).length;
    }
    return unescape(encodeURIComponent(String(text ?? ""))).length;
  }

  /**
   * @returns {{ ok: boolean, error?: string, byteLength?: number }}
   */
  function validateGenerateInput(text, maxBytes) {
    var max = maxBytes == null ? MAX_QR_TEXT_BYTES : maxBytes;
    var s = String(text ?? "");
    if (!s.trim()) {
      return { ok: false, error: "请先输入文字或链接，不能为空" };
    }
    var len = utf8ByteLength(s);
    if (len > max) {
      return {
        ok: false,
        error:
          "内容过长（约 " +
          len +
          " 字节），请缩短后再试（建议不超过约 " +
          max +
          " 字节）",
        byteLength: len,
      };
    }
    return { ok: true, byteLength: len };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 解码结果展示与安全外链分析
   * @returns {{
   *   kind: 'text'|'url'|'unsafe-scheme'|'invalid-url',
   *   raw: string,
   *   safeHref?: string,
   *   hostname?: string,
   *   warning?: string
   * }}
   */
  function analyzeDecodedContent(raw) {
    var text = String(raw ?? "");
    var trimmed = text.trim();
    var lower = trimmed.toLowerCase();
    if (
      lower.indexOf("javascript:") === 0 ||
      lower.indexOf("data:") === 0 ||
      lower.indexOf("vbscript:") === 0
    ) {
      return {
        kind: "unsafe-scheme",
        raw: text,
        warning:
          "检测到非 http(s) 链接方案，已禁止一键跳转，请仅复制所需内容，勿轻信不明链接。",
      };
    }
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        var u = new URL(trimmed);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error("protocol");
        }
        return {
          kind: "url",
          raw: text,
          safeHref: u.href,
          hostname: u.hostname,
        };
      } catch (e) {
        return {
          kind: "invalid-url",
          raw: text,
          warning: "看似链接但无法解析为合法 URL，请人工核对后复制。",
        };
      }
    }
    return { kind: "text", raw: text };
  }

  var MAX_IMAGE_BYTES = 15 * 1024 * 1024;

  function getMaxImageBytes() {
    return MAX_IMAGE_BYTES;
  }

  /**
   * @param {File|Blob} file
   * @returns {{ ok: boolean, error?: string }}
   */
  function validateImageFile(file) {
    if (!file) {
      return { ok: false, error: "未选择文件" };
    }
    var name = (file.name || "").toLowerCase();
    var type = (file.type || "").toLowerCase();
    var okExt = /\.(png|jpe?g|webp|gif)$/i.test(name);
    var okType =
      type.indexOf("image/") === 0 ||
      type === "image/png" ||
      type === "image/jpeg" ||
      type === "image/webp" ||
      type === "image/gif";
    if (!okExt && !okType) {
      return { ok: false, error: "请选择常见图片格式（PNG / JPEG / WebP 等）" };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error:
          "图片过大（" +
          Math.round(file.size / 1024 / 1024) +
          " MB），请选用小于 15 MB 的图片",
      };
    }
    return { ok: true };
  }

  /**
   * 使用 jsQR 从 ImageData 解码
   * @param {ImageData} imageData
   * @param {*} jsQRImpl window.jsQR
   */
  function decodeQrFromImageData(imageData, jsQRImpl) {
    if (!jsQRImpl || typeof jsQRImpl !== "function") {
      throw new Error("识别库未加载");
    }
    var code = jsQRImpl(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      return { ok: true, text: code.data };
    }
    return { ok: false, error: "未在图中识别到二维码，请换一张更清晰、完整的图片" };
  }

  /**
   * @param {HTMLImageElement} img
   * @param {*} jsQRImpl
   */
  function decodeQrFromImageElement(img, jsQRImpl) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) {
      return { ok: false, error: "无法读取图片尺寸" };
    }
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: "浏览器无法创建画布上下文" };
    }
    try {
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      return { ok: false, error: "图片无法绘制到画布（可能已跨域或损坏）" };
    }
    var data = ctx.getImageData(0, 0, w, h);
    return decodeQrFromImageData(data, jsQRImpl);
  }

  var api = {
    getMaxQrTextBytes: getMaxQrTextBytes,
    utf8ByteLength: utf8ByteLength,
    validateGenerateInput: validateGenerateInput,
    escapeHtml: escapeHtml,
    analyzeDecodedContent: analyzeDecodedContent,
    getMaxImageBytes: getMaxImageBytes,
    validateImageFile: validateImageFile,
    decodeQrFromImageData: decodeQrFromImageData,
    decodeQrFromImageElement: decodeQrFromImageElement,
  };

  if (typeof global !== "undefined") {
    global.QrTool = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
