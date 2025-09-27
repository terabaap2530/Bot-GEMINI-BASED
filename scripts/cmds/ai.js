const axios = require("axios");
const gTTS = require("gtts");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "ai",
    aliases: ["gpt", "talk", "chat"],
    version: "1.0",
    author: "Denish (Owner)",
    role: 0,
    shortDescription: "Ask AI and get cute TTS voice reply",
    longDescription: "GPT response converted to TTS audio using gTTS (free, no API key needed)",
    category: "fun"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, body } = event;

    try {
      // 1️⃣ Get user input
      const userText = args.join(" ") || body.split(" ").slice(1).join(" ");
      if (!userText) return api.sendMessage("❌ Please provide text for AI.", threadID);

      // 2️⃣ Call GPT API
      const gptRes = await axios.get("https://api.dreaded.site/api/chatgpt", {
        params: { text: userText },
        timeout: 20000
      });

      const gptText = gptRes.data?.result?.prompt;
      if (!gptText) return api.sendMessage("❌ Failed to get GPT response.", threadID);

      // 3️⃣ Ensure assets folder exists
      const assetsDir = path.join(__dirname, "../assets");
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

      // 4️⃣ Create TTS
      const fileName = `tts-${Date.now()}.mp3`;
      const filePath = path.join(assetsDir, fileName);

      const gtts = new gTTS(gptText, "en"); // language: English
      gtts.save(filePath, async (err) => {
        if (err) {
          console.error("❌ TTS error:", err);
          return api.sendMessage("❌ Error generating TTS audio.", threadID);
        }

        // 5️⃣ Send audio
        await api.sendMessage(
          { body: "🎙 AI Response:", attachment: fs.createReadStream(filePath) },
          threadID,
          () => fs.unlink(filePath, () => {}) // cleanup
        );
      });

    } catch (error) {
      console.error("❌ AI TTS error:", error.message || error);
      await api.sendMessage("❌ Something went wrong with AI TTS.", threadID);
    }
  }
};
