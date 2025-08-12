// File: cmds/shoti.js
const axios = require("axios");

module.exports = {
  config: {
    name: "shoti",
    aliases: ["randomshoti"],
    version: "1.2",
    author: "Lord Denish",
    countDown: 3,
    role: 0,
    shortDescription: "Get a random shoti video fast",
    longDescription: "Fetches random shoti video(s) from API with faster response",
    category: "fun",
    guide: "{p}shoti [count]"
  },

  onStart: async function ({ message, args }) {
    const count = Math.min(parseInt(args[0]) || 1, 5); // max 5 videos
    message.reply(`⏳ Fetching ${count} Shoti video(s)...`);

    try {
      // Create multiple requests in parallel
      const requests = Array(count).fill(0).map(() =>
        axios.get("https://shoti-rogpcrj2g-ryukazi-s-projects.vercel.app", {
          timeout: 7000 // 7s max
        }).catch(() => null) // Skip if fails
      );

      const results = await Promise.all(requests);
      let attachments = [];
      let textList = [];

      results.forEach((res, i) => {
        if (res && res.data?.shoti?.videoUrl) {
          const { videoUrl, nickname, username, region, title } = res.data.shoti;
          attachments.push(global.utils.getStreamFromURL(videoUrl));
          textList.push(
            `🎯 #${i + 1} ${nickname} (@${username})\n📍 ${region}\n🎵 ${title}`
          );
        }
      });

      if (attachments.length === 0) {
        return message.reply("⚠️ No Shoti videos could be fetched.");
      }

      // Send all videos together
      message.reply({
        body: textList.join("\n\n"),
        attachment: await Promise.all(attachments)
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ API is too slow or unreachable.");
    }
  }
};
