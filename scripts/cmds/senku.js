const axios = require("axios");

module.exports = {
    config: {
        name: "senku",
        version: "1.1",
        author: "Lord Denish",
        role: 0,
        shortDescription: "Senku AI smart trigger",
        longDescription: "Replies when a message starts with 'Senku', 'Senku:' or 'Senku,'.",
        category: "ai"
    },

    onStart: async function () {},

    onChat: async function ({ event, api }) {
        try {
            const text = event.body;
            if (!text) return;

            // Match Senku trigger: Senku, Senku: or Senku (case-insensitive)
            const match = text.match(/^\s*senku[:,]?\s*(.*)/i);
            if (!match) return; // Not a trigger

            const question = match[1].trim();
            if (!question) return; // Nothing after trigger

            // React ⏳ while processing
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const url = `https://kaiz-apis.gleeze.com/api/senku?ask=${encodeURIComponent(question)}&uid=${event.senderID}&apikey=ed9ad8f5-3f66-4178-aec2-d3ab4f43ad0d`;
            const res = await axios.get(url, { timeout: 20000 });

            const replyText = res.data?.response || "💔 Senku didn't reply.";

            // Send reply and react ✅
            await api.sendMessage(replyText, event.threadID, (err) => {
                if (err) api.setMessageReaction("💔", event.messageID, () => {}, true);
                else api.setMessageReaction("✅", event.messageID, () => {}, true);
            }, event.messageID);

        } catch (err) {
            console.error("Senku Smart Trigger Error:", err.message || err);
            api.setMessageReaction("💔", event.messageID, () => {}, true);
        }
    }
};
