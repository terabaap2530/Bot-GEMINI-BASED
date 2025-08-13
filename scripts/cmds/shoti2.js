const axios = require("axios");

module.exports = {
  config: {
    name: "shoti2",
    aliases: ["shoti", "s2", "dada"],
    author: "Denish",
    version: "2.1",
    cooldowns: 10,
    role: 0,
    shortDescription: "Get random shoti video",
    longDescription: "Get random shoti video",
    category: "fun",
    guide: "{p}shoti2",
  },

  onStart: async function ({ api, event, message }) {
    api.setMessageReaction("⏰", event.messageID, (err) => {}, true);

    try {
      const response = await axios.get("https://shotiii.vercel.app/random-videos");
      const data = response.data;

      console.log("API response data:", JSON.stringify(data, null, 2));

      // Try multiple fields to find the video URL
      const possibleFields = ["videoUrl", "content", "url", "play", "wmplay"];
      let videoUrl = "";
      for (const field of possibleFields) {
        if (data[field]) {
          videoUrl = data[field];
          break;
        }
      }

      if (!videoUrl) {
        // If data is an array (like TikTok style), try to get the first item's video link
        if (Array.isArray(data) && data.length > 0) {
          for (const field of possibleFields) {
            if (data[0][field]) {
              videoUrl = data[0][field];
              break;
            }
          }
        }
      }

      if (!videoUrl) throw new Error("Video URL not found in API response");

      const authors = ["Denish"];
      const userInfo = authors.join(", ");
      const title = data.title || (Array.isArray(data) ? data[0].title : "No title");

      const videoResponse = await axios.get(videoUrl, { responseType: "stream" });

      await message.reply({
        body: `Title: ${title}\nAuthor(s): ${userInfo}`,
        attachment: videoResponse.data,
      });

      api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    } catch (error) {
      console.error("Error in shoti2 command:", error);
      message.reply(`Sorry, an error occurred:\n${error.message || error}`);
    }
  },
};
