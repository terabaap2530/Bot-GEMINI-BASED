const axios = require("axios");

module.exports = {
    config: {
        name: "deepseek",
        version: "1.0",
        author: "Lord Denish",
        role: 0,
        shortDescription: "DeepSeek AI command",
        longDescription: "Replies when a message starts with 'DeepSeek', 'DeepSeek:' or 'DeepSeek,'.",
        category: "ai"
    },

    onStart: async function () {},

    onChat: async function ({ event, api }) {
        try {
            const text = event.body;
            if (!text) return;

            // Match DeepSeek trigger: DeepSeek, DeepSeek: or DeepSeek (case-insensitive)
            const match = text.match(/^\s*deepseek[:,]?\s*(.*)/i);
            if (!match) return; // Not a trigger

            const question = match[1].trim();
            if (!question) return; // Nothing after trigger

            // React ⏳ while processing
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const url = `https://kaiz-apis.gleeze.com/api/deepseek-v3?ask=${encodeURIComponent(question)}&apikey=ed9ad8f5-3f66-4178-aec2-d3ab4f43ad0d`;
            const res = await axios.get(url, { timeout: 20000 });

            const replyText = res.data?.response || "💔 DeepSeek didn't reply.";

            // Send reply and react ✅
            await api.sendMessage(replyText, event.threadID, (err) => {
                if (err) api.setMessageReaction("💔", event.messageID, () => {}, true);
                else api.setMessageReaction("✅", event.messageID, () => {}, true);
            }, event.messageID);

        } catch (err) {
            console.error("DeepSeek Command Error:", err.message || err);
            api.setMessageReaction("💔", event.messageID, () => {}, true);
        }
    }
};
