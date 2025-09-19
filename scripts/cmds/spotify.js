const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "spotify",
    aliases: ["sp", "song"],
    version: "1.1",
    author: "Lord Denish",
    description: "Download Spotify tracks by search term with reaction",
    category: "🎶 Media",
    guide: "{pn} <song/artist/keywords>\nExample: {pn} con calma"
  },

  onStart: async function({ api, event, args }) {
    const safeReply = async (text) => {
      try { await api.sendMessage(text, event.threadID); } catch(e){ console.error("Reply failed:", e); }
    };

    if (!args.length) return safeReply("⚠️ Usage: .spotify <song/artist/keywords>");

    try {
      const query = args.join(" ").trim();
      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;

      const { data } = await axios.get(apiUrl, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });

      if (!data?.status || !data?.result) return safeReply("❌ No results found for your query.");

      const r = data.result;
      if (!r.audio) return safeReply("❌ No downloadable audio found for this query.");

      const tempFile = path.join(__dirname, `spotify_${Date.now()}.mp3`);
      const audioResponse = await axios({ method: 'get', url: r.audio, responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const writer = fs.createWriteStream(tempFile);
      audioResponse.data.pipe(writer);

      writer.on('finish', async () => {
        const message = {
          body: `🎵 ${r.title || r.name || 'Spotify Track'}\n👤 ${r.artist || ''}\n⏱ ${r.duration || ''}\n🔗 ${r.url || ''}`,
          attachment: [ 
            ...(r.thumbnails ? [await axios.get(r.thumbnails, { responseType: 'stream' })] : []),
            fs.createReadStream(tempFile)
          ]
        };

        const sentMessage = await api.sendMessage(message, event.threadID);

        // Add reactions (like .sing)
        try { 
          await api.setMessageReaction('🎶', sentMessage.messageID); 
          await api.setMessageReaction('🔥', sentMessage.messageID); 
        } catch(e) { console.error("Reaction failed:", e); }

        try { fs.unlinkSync(tempFile); } catch(e) {}
      });

      writer.on('error', async (err) => {
        console.error("[SPOTIFY] write stream error:", err);
        await safeReply("❌ Failed to download Spotify audio.");
        try { fs.unlinkSync(tempFile); } catch(e) {}
      });

    } catch (err) {
      console.error('[SPOTIFY] error:', err?.message || err);
      await safeReply("❌ Failed to fetch Spotify audio. Try another query later.");
    }
  }
};
