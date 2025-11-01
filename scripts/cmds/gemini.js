const axios = require("axios");

// Track active conversations per thread
const activeConversations = {};

module.exports = {
  config: {
    name: "gemini",
    aliases: ["gem", "gim", "gemini"],
    version: "1.4",
    author: "Lord Denish",
    role: 0,
    shortDescription: "Gemini-Pro AI reply-based command",
    longDescription: "Replies only when the user replies to bot, keeps conversation safe from spam, avoids infinite loops.",
    category: "ai"
  },

  onStart: async function () {},

  onChat: async function ({ event, api }) {
    try {
      const text = event.body;
      if (!text) return;

      // ✅ Ignore messages from the bot itself
      if (event.senderID === api.getCurrentUserID()) return;

      const triggers = ["gemini", "gim", "gem"];
      const regex = new RegExp(`^\\s*!?(${triggers.join("|")})[:,]?\\s*(.*)`, "i");
      const match = text.match(regex);
      const threadID = event.threadID;
      const senderID = event.senderID;

      // Ignore if someone else is in conversation
      if (activeConversations[threadID] && activeConversations[threadID] !== senderID) return;

      let question;
      let isReply = false;

      // Triggered by !Gemini <text>
      if (match) {
        question = match[2]?.trim();
        isReply = true;
      } 
      // Triggered by replying to bot message
      else if (event.messageReply && event.messageReply.senderID === api.getCurrentUserID()) {
        question = text.trim();
        isReply = true;
      }

      if (!isReply || !question) return;

      // Lock conversation for this user
      activeConversations[threadID] = senderID;

      // Call Okatsu Gemini API
      const url = `https://okatsu-rolezapiiz.vercel.app/ai/gemini?text=${encodeURIComponent(question)}`;
      const res = await axios.get(url, { timeout: 20000 });
      const replyText = res.data?.result?.text || "💔 Gemini-Pro didn't reply.";

      // Send reply
      await api.sendMessage(replyText, threadID, event.messageID);

      // Reset inactivity timer (5 minutes)
      clearTimeout(activeConversations[`timeout_${threadID}`]);
      activeConversations[`timeout_${threadID}`] = setTimeout(() => {
        delete activeConversations[threadID];
        delete activeConversations[`timeout_${threadID}`];
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error("Gemini Command Error:", err.message || err);
      delete activeConversations[event.threadID];
    }
  }
};
