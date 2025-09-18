const axios = require("axios");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins"],
    version: "1.5",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Get Pinterest images",
    longDescription: "Fetch up to 70 Pinterest images using your API",
    category: "fun",
    guide: {
      en: "{p}pinterest <keyword> [amount]",
    },
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("❌ Please provide a search keyword. Usage: pinterest <keyword> [amount]");
    }

    const query = args[0];
    let amount = 1;

    if (args[1]) {
      amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 70) amount = 70; // max 70 images
    }

    // 🔥 Updated API URL
    const apiUrl = `https://pin-api-itachi.vercel.app/api/pinterest?q=${encodeURIComponent(query)}`;

    try {
      const res = await axios.get(apiUrl);
      const data = res.data?.data || [];

      if (!data.length) {
        return message.reply(`❌ No results found for: **${query}**`);
      }

      const images = data.slice(0, amount);

      // Download all images as streams
      const attachments = await Promise.all(
        images.map(async (url) => {
          const response = await axios.get(url, { responseType: "stream" });
          return response.data;
        })
      );

      // Send all images in one message
      await message.reply({
        body: `📌 Pinterest results for: **${query}**\n🖼️ Showing ${attachments.length} image(s)`,
        attachment: attachments
      });

    } catch (error) {
      console.error(error);
      message.reply("❌ Failed to fetch Pinterest images.");
    }
  },
};
