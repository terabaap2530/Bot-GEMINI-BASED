const axios = require("axios");

const timers = new Map(); // store timers per thread

module.exports = {
  config: {
    name: "anime",
    aliases: ["ae"],
    author: "Denish",
    version: "1.0",
    cooldowns: 5,
    role: 0,
    shortDescription: "Get random anime videos",
    longDescription: "Send a random anime video from the API. Timer option available.",
    category: "fun",
    guide: "{pn} or {pn} on/off\nExample: anime on → send random anime every 10 minutes."
  },

  onStart: async function({ api, event, message, args }) {
    const threadID = event.threadID;

    // check if user wants timer
    const subCommand = args[0]?.toLowerCase();

    // 🔹 Timer ON
    if (subCommand === "on") {
      if (timers.has(threadID)) {
        return message.reply("⏱ Timer is already ON for this chat.");
      }

      const sendAnime = async () => {
        try {
          const res = await axios.get("https://ran-animw.onrender.com/denish-random", { responseType: "stream" });
          await message.reply({ attachment: res.data });
        } catch (err) {
          console.error("❌ Failed to fetch anime video:", err.message);
        }
      };

      // send immediately
      await sendAnime();

      // set interval every 10 minutes
      const interval = setInterval(sendAnime, 10 * 60 * 1000); 
      timers.set(threadID, interval);
      return message.reply("✅ Timer ON: will send random anime video every 10 minutes.");
    }

    // 🔹 Timer OFF
    if (subCommand === "off") {
      if (!timers.has(threadID)) return message.reply("⚠️ Timer is already OFF.");
      clearInterval(timers.get(threadID));
      timers.delete(threadID);
      return message.reply("⏹ Timer OFF: no more automatic anime videos.");
    }

    // 🔹 Normal command: send 1 random anime video
    try {
      const res = await axios.get("https://ran-animw.onrender.com/denish-random", { responseType: "stream" });
      await message.reply({ attachment: res.data });
    } catch (err) {
      console.error("❌ Failed to fetch anime video:", err.message);
      return message.reply("❌ Something went wrong while fetching anime video.");
    }
  }
};
