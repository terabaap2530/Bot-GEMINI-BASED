const axios = require("axios");
const fs = require("fs");
const path = require("path");
const https = require("https");

module.exports = {
  config: {
    name: "igs",
    aliases: ["iginfo", "instainfo"],
    version: "2.0",
    author: "Lord Denish",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Fetch Instagram profile info" },
    description: {
      en: "Get detailed Instagram profile info including followers, posts, and HD profile picture."
    },
    category: "📱 Social",
    guide: { en: "{pn} <username>" }
  },

  onStart: async function ({ api, message, args, event }) {
    const username = args[0]?.replace("@", "");
    if (!username) return message.reply("⚠️ | Please provide a valid Instagram username.\nExample: .igstalk username");

    if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const { data } = await axios.get(`https://dens-ig-stalk.vercel.app/api/ig?user=${encodeURIComponent(username)}`);

      if (!data.status || !data.result) {
        if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ | Failed to fetch data. Please check the username or try again later.");
      }

      const profile = data.result.profile;
      const stats = data.result.stats;
      const status = data.result.status;
      const hdAvatar = profile.avatars.hd;

      const info = `
📸 *Instagram Profile Info*
────────────────────
👤 *Username:* ${profile.username}
💫 *Full Name:* ${profile.fullName || "Not available"}
🔗 *Profile URL:* ${profile.profileUrl}

📊 *Stats:*
👥 Followers: ${stats.followers}
👤 Following: ${stats.following}
🖼️ Posts: ${stats.mediaCount}
📈 Engagement: ${stats.engagementRate}

⚙️ *Account Info:*
🔒 Private: ${status.isPrivate ? "Yes" : "No"}
✅ Verified: ${status.isVerified ? "Yes" : "No"}
🏢 Business: ${status.isBusiness ? "Yes" : "No"}

👑 *Author:* ${data.author}
`;

      // Download HD avatar temporarily
      const tempPath = path.join(__dirname, `ig_${Date.now()}.jpg`);
      const response = await axios({
        url: hdAvatar,
        method: "GET",
        responseType: "stream",
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.reply({
        body: info,
        attachment: fs.createReadStream(tempPath)
      });

      fs.unlinkSync(tempPath);
      if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (err) {
      console.error("Instagram API Error:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ | Error fetching Instagram profile. Try again later.");
    }
  }
};
