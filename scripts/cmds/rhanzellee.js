const axios = require("axios");

module.exports = {
  config: {
    name: "rhanzellee",
    aliases: [],
    version: "2.1",
    author: "Denish",
    countDown: 1,
    role: 0,
    shortDescription: "Auto send Rhanzellee videos",
    longDescription: "Triggers only on related keywords, initials or standalone R",
    category: "no prefix",
  },

  onStart: async function({ api, event }) {
    return this.sendVideo(api, event);
  },

  onChat: async function({ api, event }) {
    const msg = event.body?.toLowerCase().trim();
    if (!msg) return;

    // Precise triggers
    const triggers = [
      "rhanzellee",
      "rhan",
      "rhanz",
      "rhz",
      "ellee",
      "ihr"
    ];

    // 1. Match full keywords EXACTLY
    if (triggers.some(t => msg.includes(t))) {
      await this.reactMessage(api, event);
      return this.sendVideo(api, event);
    }

    // 2. Match SINGLE-LETTER R only if it's a separate word
    // Messages like: "R", "r", "send r", "hey R"
    const words = msg.split(/\s+/); // split into words
    if (words.includes("r")) {
      await this.reactMessage(api, event);
      return this.sendVideo(api, event);
    }
  },

  reactMessage: async function(api, event) {
    try {
      await api.setMessageReaction("👀", event.messageID, event.senderID);
      setTimeout(() => {
        api.setMessageReaction("✔️", event.messageID, event.senderID);
      }, 800);
    } catch (e) {
      console.log("Reaction error:", e);
    }
  },

  sendVideo: async function(api, event) {
    try {
      const url = `https://dens-fyp.vercel.app/api/fyp?q=rhanzellee`;
      const res = await axios.get(url);

      const list = res.data.data;
      if (!list || list.length === 0) {
        return api.sendMessage("⚠️ No videos found.", event.threadID);
      }

      const video = list[Math.floor(Math.random() * list.length)];

      await api.sendMessage(
        {
          body: "",
          attachment: await global.utils.getStreamFromURL(video.nowm)
        },
        event.threadID,
        event.messageID
      );
    } catch (err) {
      console.log("Send video error:", err);
      api.sendMessage("❌ Could not fetch video.", event.threadID);
    }
  }
};
