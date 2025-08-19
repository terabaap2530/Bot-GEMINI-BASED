const axios = require("axios");

module.exports = {
    config: {
        name: "gemini",
        aliases: ["gem", "gim", "gemini"], // short names supported
        version: "1.0",
        author: "Lord Denish",
        role: 0,
        shortDescription: "Gemini-Pro AI command",
        longDescription: "Replies when a message starts with 'Gemini', 'Gim', or 'Gem'.",
        category: "ai"
    },

    onStart: async function () {},

    onChat: async function ({ event, api }) {
        try {
            const text = event.body;
            if (!text) return;

            // Build regex dynamically from aliases
            const triggers = ["gemini", "gim", "gem"];
            const regex = new RegExp(`^\\s*(${triggers.join("|")})[:,]?\\s*(.*)`, "i");

            const match = text.match(regex);
            if (!match) return;

            const question = match[2]?.trim();
            if (!question) return;

            // Show ⏳ reaction during processing
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const url = `https://kaiz-apis.gleeze.com/api/gemini-pro?ask=${encodeURIComponent(question)}&uid=100001139113438&apikey=ed9ad8f5-3f66-4178-aec2-d3ab4f43ad0d`;
            const res = await axios.get(url, { timeout: 20000 });

            const replyText = res.data?.response || "💔 Gemini-Pro didn't reply.";

            // Send reply and reaction
            await api.sendMessage(replyText, event.threadID, (err) => {
                if (err) api.setMessageReaction("💔", event.messageID, () => {}, true);
                else api.setMessageReaction("✅", event.messageID, () => {}, true);
            }, event.messageID);

        } catch (err) {
            console.error("Gemini Command Error:", err.message || err);
            api.setMessageReaction("💔", event.messageID, () => {}, true);
        }
    }
};
