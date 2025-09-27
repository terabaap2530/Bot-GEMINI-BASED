const axios = require("axios");

module.exports = {
  config: {
    name: "shoti2",
    aliases: ["shoti", "s2", "dada"],
    author: "Denish",
    version: "2.2",
    cooldowns: 10,
    role: 0,
    shortDescription: "Get random shoti video",
    longDescription: "Get random shoti video",
    category: "fun",
    guide: "{p}shoti2",
  },

  onStart: async function ({ api, event, message }) {
    api.setMessageReaction("⏰", event.messageID, () => {}, true);

    try {
      // Get the video stream directly from API
      const videoResponse = await axios.get(
        "https://shoti-gurl.vercel.app/api/denish-random",
        { responseType: "stream" }
      );

      // Send the stream as attachment
      await message.reply({
        body: `Author: Denish\nTitle: Random Shoti Video`,
        attachment: videoResponse.data,
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("Error in shoti2 command:", error);
      message.reply(`Sorry, an error occurred:\n${error.message || error}`);
    }
  },
};
