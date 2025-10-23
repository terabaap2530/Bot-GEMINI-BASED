const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

const API_ENDPOINTS = {
  instagram: url => `https://universal-dl-one.vercel.app/api/instagram?url=${encodeURIComponent(url)}`,
  instaStory: url => `https://dens-insta-story.vercel.app/api/story?url=${encodeURIComponent(url)}`,
  tiktok: url => `https://universal-dl-one.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`,
  youtube: url => `https://universal-dl-one.vercel.app/api/youtube?url=${encodeURIComponent(url)}`,
  facebook: url => `https://universal-dl-one.vercel.app/api/facebook?url=${encodeURIComponent(url)}`
};

async function expandTikTokUrl(shortUrl) {
  try {
    const res = await axios.get(shortUrl, { maxRedirects: 0, validateStatus: s => s < 400 });
    if (res.status === 301 || res.status === 302) return res.headers.location;
    return shortUrl;
  } catch (e) {
    if (e.response && (e.response.status === 301 || e.response.status === 302)) return e.response.headers.location;
    return shortUrl;
  }
}

function chooseApiUrl(url) {
  const host = parse(url).hostname || "";
  if (host.includes("instagram.com") && url.includes("/stories")) return API_ENDPOINTS.instaStory(url);
  if (host.includes("instagram.com")) return API_ENDPOINTS.instagram(url);
  if (host.includes("tiktok.com") || host.includes("vt.tiktok.com")) return API_ENDPOINTS.tiktok(url);
  if (host.includes("youtube.com") || host.includes("youtu.be")) return API_ENDPOINTS.youtube(url);
  if (host.includes("facebook.com") || host.includes("fb.watch")) return API_ENDPOINTS.facebook(url);
  return null;
}

module.exports = {
  config: {
    name: "autolink",
    version: "3.2",
    author: "Lord Denish",
    shortDescription: "Send raw playable video from Instagram/TikTok/YT/Facebook",
    category: "media"
  },

  onStart: async function() {
    // Required empty function
  },

  onChat: async function({ event, api }) {
    try {
      const text = event.body || "";
      const match = text.match(/https?:\/\/[^\s]+/i);
      if (!match) return;

      let url = match[0].replace(/\?$/, "");
      let hostname = parse(url).hostname || "";

      if (hostname.includes("tiktok") && url.includes("vt.tiktok.com")) {
        url = await expandTikTokUrl(url);
        hostname = parse(url).hostname || "";
      }

      const apiUrl = chooseApiUrl(url);
      if (!apiUrl) {
        await api.sendMessage("❌ Unsupported platform.", event.threadID);
        return;
      }

      try { api.setMessageReaction("⏳", event.messageID, () => {}, true); } catch(e){}

      const apiRes = await axios.get(apiUrl, { timeout: 20000 });
      const data = apiRes.data || {};

      let videoUrl = null;
      const hostLower = hostname.toLowerCase();

      if (hostLower.includes("instagram.com") && !url.includes("/stories")) {
        videoUrl = data?.result?.url || (data?.result?.downloads ? data.result.downloads.slice(-1)[0] : null);
      } else if (hostLower.includes("instagram.com") && url.includes("/stories")) {
        videoUrl = data?.result?.downloads?.slice(-1)[0] || data?.downloads?.slice(-1)[0] || data?.result?.url || null;
      } else if (hostLower.includes("tiktok")) {
        const tiktokData = data?.result?.result || data?.result || {};
        // USE SD LINK ONLY
        videoUrl = tiktokData.sd_link || tiktokData.hd_link || tiktokData.link || null;
      } else if (hostLower.includes("youtube") || hostLower.includes("youtu.be")) {
        videoUrl = data?.result?.mp4 || data?.result?.url || null;
      } else if (hostLower.includes("facebook") || hostLower.includes("fb.watch")) {
        videoUrl = data?.result?.data?.[0]?.hd_link || data?.result?.data?.[0]?.sd_link || null;
      }

      if (!videoUrl || !videoUrl.startsWith("http")) {
        try { api.setMessageReaction("💔", event.messageID, () => {}, true); } catch(e){}
        await api.sendMessage("❌ Could not find a playable video URL.", event.threadID);
        return;
      }

      // TEMP file fallback if direct stream fails
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      const tmpPath = path.join(cacheDir, `video_${Date.now()}.mp4`);

      const fileResp = await axios({ method: "GET", url: videoUrl, responseType: "stream", timeout: 60000, headers: { "User-Agent": "Mozilla/5.0" } });
      const writer = fs.createWriteStream(tmpPath);
      fileResp.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await api.sendMessage({
        body: `🎬 Video from ${hostname}`,
        attachment: fs.createReadStream(tmpPath)
      }, event.threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch(e){}
        try { api.setMessageReaction("✅", event.messageID, () => {}, true); } catch(e){}
      });

    } catch (err) {
      console.error("Autolink error:", err.stack || err.message || err);
      try { api.setMessageReaction("💔", event.messageID, () => {}, true); } catch(e){}
      await api.sendMessage("❌ Error fetching/sending video.", event.threadID);
    }
  }
};
