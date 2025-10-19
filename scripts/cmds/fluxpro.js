https://apis-keith.vercel.app/shortener/tinyurl?url=const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "fluxpro",
    aliases: ["fp"],
    version: "1.3",
    author: "Lord Denish",
    countDown: 2,
    description: "Generate an AI image from FluxPro API",
    category: "image"
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query)
      return api.sendMessage("Please provide a prompt. Example: fp dog", threadID, messageID);

    const apiUrl = `https://dens-fluxpro.vercel.app/denish?q=${encodeURIComponent(query)}`;
    const cacheDir = path.join(__dirname, "cache");
    const outPath = path.join(cacheDir, `fluxpro_${Date.now()}.png`);

    try {
      await fs.ensureDir(cacheDir);

      // Get image buffer (supports direct image or JSON → image URL)
      const buffer = await fetchImageBuffer(apiUrl, 3);

      await fs.writeFile(outPath, buffer);

      await api.sendMessage({
        attachment: fs.createReadStream(outPath)
      }, threadID, () => fs.unlink(outPath).catch(() => {}), messageID);

    } catch (err) {
      console.error("[fluxpro]", err);
      api.sendMessage("❌ Failed to generate image. Please try again later.", threadID, messageID);
      try { await fs.unlink(outPath); } catch {}
    }
  }
};

// --- Utility functions ---

async function fetchImageBuffer(url, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 120000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "image/*,application/json,*/*"
        },
        maxContentLength: 300 * 1024 * 1024
      });

      const type = (res.headers["content-type"] || "").toLowerCase();
      const buf = Buffer.from(res.data);

      // Direct image
      if (type.startsWith("image/") || isImage(buf)) return buf;

      // JSON → extract image URL
      if (type.includes("json") || looksLikeJson(buf)) {
        const data = JSON.parse(buf.toString("utf8"));
        const imageUrl = findImageUrl(data);
        if (!imageUrl) throw new Error("No image URL found in JSON");
        return await downloadImage(imageUrl);
      }

      throw new Error(`Unexpected content type: ${type}`);

    } catch (err) {
      lastError = err;
      console.warn(`[fluxpro] Attempt ${i + 1} failed: ${err.message}`);
      if (i < retries - 1) await delay(1000 * 2 ** i);
    }
  }
  throw lastError || new Error("All retries failed");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isImage(buf) {
  if (!buf || buf.length < 8) return false;
  const hex = buf.slice(0, 8).toString("hex");
  const ascii6 = buf.slice(0, 6).toString("ascii");
  return hex.startsWith("ffd8ff") || hex === "89504e470d0a1a0a" || ascii6 === "GIF89a" || ascii6 === "GIF87a";
}

function looksLikeJson(buf) {
  try {
    const s = buf.slice(0, 256).toString("utf8").trim();
    return s.startsWith("{") || s.startsWith("[");
  } catch { return false; }
}

async function downloadImage(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*,*/*" }
  });
  const buf = Buffer.from(res.data);
  if (!isImage(buf)) throw new Error("Downloaded data is not an image");
  return buf;
}

function findImageUrl(obj) {
  if (!obj) return null;
  if (typeof obj === "string") {
    const m = obj.match(/https?:\/\/[^\s"']+/);
    return m ? m[0] : null;
  }

  const keys = [
    "image", "imageUrl", "image_url", "img", "url",
    "data", "result", "resultUrl", "download", "output", "downloadUrl"
  ];

  for (const key of keys) {
    const val = obj[key];
    if (!val) continue;
    const found = findImageUrl(val);
    if (found) return found;
  }

  if (typeof obj === "object") {
    for (const val of Object.values(obj)) {
      const found = findImageUrl(val);
      if (found) return found;
    }
  }
  return null;
}
