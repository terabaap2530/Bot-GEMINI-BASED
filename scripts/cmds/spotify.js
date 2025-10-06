const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    aliases: ["sp", "song"],
    version: "2.0",
    author: "Lord Denish",
    description: "Download Spotify tracks as MP3 audio (no description)",
    category: "🎶 Media",
    guide: "{pn} <song/artist/keywords>\nExample: {pn} I Wanna Be Yours"
  },

  onStart: async function ({ api, event, args }) {
    const safeReply = async (text) => {
      try { await api.sendMessage(text, event.threadID, event.messageID); }
      catch (e) { console.error("Reply failed:", e); }
    };

    if (!args.length)
      return safeReply("⚠️ Usage: .spotify <song/artist/keywords>");

    const query = args.join(" ").trim();

    try {
      const apiUrl = `https://search-spotify.vercel.app/api/spotify/search-download?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl, {
        timeout: 25000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!data?.status || !data?.data?.download)
        return safeReply("❌ No audio found for your query.");

      const song = data.data;
      const tempFile = path.join(__dirname, `spotify_${Date.now()}.mp3`);

      const audioResponse = await axios({
        method: "get",
        url: song.download,
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const writer = fs.createWriteStream(tempFile);
      audioResponse.data.pipe(writer);

      writer.on("finish", async () => {
        try {
          const sent = await api.sendMessage(
            { attachment: fs.createReadStream(tempFile) },
            event.threadID
          );

          try {
            await api.setMessageReaction("🎧", sent.messageID);
            await api.setMessageReaction("🔥", sent.messageID);
          } catch (e) {
            console.error("Reaction failed:", e);
          }

          fs.unlinkSync(tempFile);
        } catch (err) {
          console.error("Send error:", err);
          await safeReply("❌ Failed to send audio file.");
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }
      });

      writer.on("error", async (err) => {
        console.error("Write stream error:", err);
        await safeReply("❌ Error saving Spotify track.");
        try { fs.unlinkSync(tempFile); } catch (e) {}
      });
    } catch (err) {
      console.error("Spotify error:", err?.message || err);
      await safeReply("❌ Failed to fetch Spotify audio. Try again later.");
    }
  },
};
