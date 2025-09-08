const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

module.exports = {
    config: {
        name: "sing",
        aliases: ["s"],
        version: "5.3",
        author: "Lord Denish",
        countDown: 20,
        role: 0,
        shortDescription: {
            en: "Auto-download songs from YouTube or recognized audio/video"
        },
        description: "Reply to audio/video or type a search term to download the song as MP3 automatically.",
        category: "🎶 Media",
        guide: {
            en: "{pn} <song name>\nReply to an audio/video to auto-download."
        }
    },

    onStart: async function ({ api, message, args, event }) {
        let songName;

        try {
            // ⏳ React while processing
            if (api.setMessageReaction) api.setMessageReaction("⏳", event.messageID, () => {}, true);

            // --- Case 1: Reply recognition ---
            if (event.messageReply && event.messageReply.attachments?.length > 0) {
                const attachment = event.messageReply.attachments[0];
                if (attachment.type === "audio" || attachment.type === "video") {
                    try {
                        // ✅ Using your new API
                        const recogUrl = `https://auddo-reco.onrender.com/denish?url=${encodeURIComponent(attachment.url)}`;
                        const { data: recogData } = await axios.get(recogUrl);
                        if (recogData?.title) songName = recogData.title;
                    } catch (err) {
                        console.error("Audio-Recon API failed (silent fallback):", err.response?.data || err.message);
                        // Silent fallback to text search
                    }
                }
            }

            // --- Case 2: Text query fallback ---
            if (!songName) {
                if (!args.length) {
                    if (api.setMessageReaction) api.setMessageReaction("⚠️", event.messageID, () => {}, true);
                    return message.reply("⚠️ Provide a song name or reply to audio/video.");
                }
                songName = args.join(" ");
            }

            const startTime = Date.now();

            // --- Search using DNS-Ruby ---
            let searchResults;
            try {
                const { data } = await axios.get(`https://dns-ruby.vercel.app/search?query=${encodeURIComponent(songName)}`);
                searchResults = data;
            } catch (err) {
                console.error("❌ DNS-Ruby API failed:", err.response?.data || err.message);
                if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
                return message.reply("❌ Search API failed.");
            }

            if (!searchResults || !searchResults[0]?.url) {
                if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
                return message.reply("❌ No results found for this query.");
            }

            const song = searchResults[0];
            const videoUrl = song.url;

            // --- Download using Download API ---
            let downloadData;
            try {
                const { data } = await axios.get(`https://ytmp-f4d4.onrender.com/api/ytdown-mp3?url=${encodeURIComponent(videoUrl)}`);
                downloadData = data;
            } catch (err) {
                console.error("❌ Download API failed:", err.response?.data || err.message);
                if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
                return message.reply("❌ Download API failed.");
            }

            if (!downloadData?.download_url) {
                if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
                return message.reply("❌ Download API did not return a valid link.");
            }

            // --- Prepare message ---
            const songInfoMessage = `
🎶 *Now Playing*: ${song.title || "Unknown"}  
👀 *Views*: ${song.views || "Unknown"}  
⏳ *Duration*: ${song.timestamp || "Unknown"}  
⚡ *Fetched in*: ${(Date.now() - startTime) / 1000}s  
`;

            // --- Download MP3 and send ---
            const audioStream = await axios({
                url: downloadData.download_url,
                method: "GET",
                responseType: "stream",
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });

            const tempPath = path.join(__dirname, "tempAudio.mp3");
            const writer = fs.createWriteStream(tempPath);
            audioStream.data.pipe(writer);

            writer.on("finish", async () => {
                await message.reply({
                    body: songInfoMessage,
                    attachment: fs.createReadStream(tempPath)
                });

                if (api.setMessageReaction) api.setMessageReaction("✅", event.messageID, () => {}, true);

                // Clean up temp file
                fs.unlinkSync(tempPath);
            });

        } catch (err) {
            console.error("❌ [Sing Command Error]:", err);
            if (api.setMessageReaction) api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply("❌ Something went wrong while fetching the song. Please try again later.");
        }
    }
};
