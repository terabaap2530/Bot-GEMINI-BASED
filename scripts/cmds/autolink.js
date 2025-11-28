const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

const API_ENDPOINTS = {
  instagram: url => `https://universal-dl-one.vercel.app/api/instagram?url=${encodeURIComponent(url)}`,
  tiktok: url => `https://universal-dl-one.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`,
  youtube: url => `https://universal-dl-one.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
  facebook: url => `https://universal-dl-one.vercel.app/api/facebook?url=${encodeURIComponent(url)}`,
  pinterest: url => `https://universal-dl-one.vercel.app/api/pinterest?url=${encodeURIComponent(url)}`,
  twitter: url => `https://universal-dl-one.vercel.app/api/twitter?url=${encodeURIComponent(url)}`
};

async function expandShortUrl(shortUrl) {
  try {
    const res = await axios.get(shortUrl, { maxRedirects: 0, validateStatus: s => s < 400 });
    if (res.status === 301 || res.status === 302) return res.headers.location;
    return shortUrl;
  } catch (e) {
    if (e.response && (e.response.status === 301 || e.response.status === 302))
      return e.response.headers.location;
    return shortUrl;
  }
}

function chooseApiUrl(url) {
  const host = parse(url).hostname || "";
  if (host.includes("instagram.com")) return API_ENDPOINTS.instagram(url);
  if (host.includes("tiktok.com") || host.includes("vt.tiktok.com")) return API_ENDPOINTS.tiktok(url);
  if (host.includes("youtube.com") || host.includes("youtu.be")) return API_ENDPOINTS.youtube(url);
  if (host.includes("facebook.com") || host.includes("fb.watch")) return API_ENDPOINTS.facebook(url);
  if (host.includes("pinterest.com")) return API_ENDPOINTS.pinterest(url);
  if (host.includes("twitter.com")) return API_ENDPOINTS.twitter(url);
  return null;
}

module.exports = {
  config: {
    name: "autolink",
    version: "4.3",
    author: "Lord Denish",
    shortDescription: "Silent auto downloader with only reactions",
    category: "media"
  },

  onStart: async function () {},

  onChat: async function ({ event, api }) {
    try {
      const text = event.body || "";
      const match = text.match(/https?:\/\/[^\s]+/i);
      if (!match) return;

      let url = match[0].replace(/\?$/, "");
      const hostname = parse(url).hostname || "";

      // Reaction: Processing
      try { api.setMessageReaction("⏳", event.messageID, () => {}, true); } catch {}

      if (hostname.includes("vt.tiktok.com"))
        url = await expandShortUrl(url);

      const apiUrl = chooseApiUrl(url);
      if (!apiUrl) return;

      const apiRes = await axios.get(apiUrl, { timeout: 20000 });
      const data = apiRes.data || {};
      let videoUrl = null;

      // Platform handling
      if (hostname.includes("tiktok")) {
        videoUrl =
          data?.result?.videoHd ||
          data?.result?.video ||
          data?.result?.videos?.[0] ||
          null;

      } else if (hostname.includes("youtube") || hostname.includes("youtu.be")) {
        videoUrl = data?.result?.mp4 || data?.result?.url || null;

      } else if (hostname.includes("instagram")) {
        videoUrl =
          data?.result?.data?.videoUrl ||
          data?.result?.videoUrl ||
          data?.videoUrl ||
          null;

      } else if (hostname.includes("facebook") || hostname.includes("fb.watch")) {
        videoUrl =
          data?.result?.data?.[0]?.hd_link ||
          data?.result?.data?.[0]?.sd_link ||
          null;

      } else if (hostname.includes("pinterest") || hostname.includes("twitter")) {
        videoUrl = data?.result?.url || null;
      }

      if (!videoUrl) {
        try { api.setMessageReaction("💔", event.messageID, () => {}, true); } catch {}
        return;
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const tmpPath = path.join(cacheDir, `video_${Date.now()}.mp4`);

      const fileResp = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      const writer = fs.createWriteStream(tmpPath);
      fileResp.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await api.sendMessage(
        {
          attachment: fs.createReadStream(tmpPath)
        },
        event.threadID,
        () => {
          try { fs.unlinkSync(tmpPath); } catch {}
          try { api.setMessageReaction("✅", event.messageID, () => {}, true); } catch {}
        }
      );

    } catch (err) {
      console.error("Autolink Error:", err.message);
      try { api.setMessageReaction("💔", event.messageID, () => {}, true); } catch {}
    }
  }
};
