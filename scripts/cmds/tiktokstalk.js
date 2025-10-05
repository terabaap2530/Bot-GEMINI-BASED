const axios = require("axios");

// Helper to fetch image as stream or buffer
async function getStreamForUrl(url) {
  if (!url) return null;
  try {
    if (global?.utils?.getStreamFromURL) return await global.utils.getStreamFromURL(url);
    const res = await axios.get(url, { responseType: "stream", timeout: 20000 });
    return res.data;
  } catch {
    return null;
  }
}

// Convert strings like "1,234" or "12 345" to numbers safely
function toNumber(v, defaultValue = 0) {
  if (v == null || v === "") return defaultValue;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[, ]+/g, "").match(/\d+/);
    if (cleaned) return parseInt(cleaned[0], 10);
    return defaultValue;
  }
  return defaultValue;
}

module.exports = {
  config: {
    name: "tiktokstalk",
    aliases: ["ttstalk", "tiktok"],
    version: "2.0",
    author: "Denish Tharu (merged & fixed)",
    role: 0,
    shortDescription: "Stalk a TikTok user",
    longDescription: "Fetch TikTok user info and profile picture",
    category: "utility",
    guide: "{pn}tiktokstalk <username or @username or profile_url>"
  },

  onStart: async function ({ event, api, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;

    try { api.setMessageReaction?.("⏳", messageID, () => {}, true); } catch {}

    if (!args[0]) {
      try { api.setMessageReaction?.("❌", messageID, () => {}, true); } catch {}
      return api.sendMessage("❌ Please provide a TikTok username.", threadID, messageID);
    }

    const raw = args[0].trim();
    const extractFromUrl = s => {
      try {
        const u = new URL(s);
        const parts = u.pathname.split("/").filter(Boolean);
        return parts.length ? parts.find(p => p.startsWith("@")) || parts[parts.length - 1] : s;
      } catch { return s; }
    };

    let base = /^https?:\/\//i.test(raw) ? extractFromUrl(raw) : raw;
    base = base.replace(/\/+$/, "");
    const plain = base.startsWith("@") ? base.slice(1) : base;
    const variants = [base, "@" + plain, plain].filter((v, i, a) => a.indexOf(v) === i);

    let lastError = null;

    for (const handle of variants) {
      const apiUrl = `https://dens-tiktok-stalk.vercel.app/api/tiktokstalk?q=${encodeURIComponent(handle)}`;
      try {
        const res = await axios.get(apiUrl, { timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
        const body = res.data;

        if (!body?.result?.users) {
          lastError = "No users object found";
          console.error("API response:", JSON.stringify(body).slice(0, 5000));
          continue;
        }

        const user = body.result.users;
        const stats = body.stats || body.result.stats || {};

        const username = user.username || plain;
        const bio = user.signature || "None";
        const followers = toNumber(stats.followerCount);
        const following = toNumber(stats.followingCount);
        const posts = toNumber(stats.videoCount);
        const verified = !!user.verified;
        const privateAccount = !!user.privateAccount;
        const avatarUrl = user.avatarLarger || user.avatarMedium || user.avatarThumb || null;

        const profileText = `📱 TikTok Stalk Result

👤 Username: ${username}
🆔 UID: Unknown
📝 Bio: ${bio}
📊 Stats:
Followers: ${followers.toLocaleString()}
Following: ${following.toLocaleString()}
Posts: ${posts.toLocaleString()}
⭐ Verified: ${verified ? "Yes" : "No"}
🔒 Private: ${privateAccount ? "Yes" : "No"}

Creator: ${body.creator || "Denish Tharu"}`;

        const avatarStream = await getStreamForUrl(avatarUrl);
        if (avatarStream) {
          // Send text + avatar in the same message
          await api.sendMessage({ body: profileText, attachment: avatarStream }, threadID, messageID);
        } else {
          await api.sendMessage(profileText, threadID, messageID);
        }

        try { api.setMessageReaction?.("✅", messageID, () => {}, true); } catch {}
        return;

      } catch (err) {
        lastError = err;
        console.error("tiktokstalk axios error:", err?.message || err);
        continue;
      }
    }

    try { api.setMessageReaction?.("❌", messageID, () => {}, true); } catch {}
    return api.sendMessage("❌ Error: could not fetch TikTok data.", threadID, messageID);
  }
};
