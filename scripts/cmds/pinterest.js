const axios = require("axios");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins"],
    version: "2.2",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Get Pinterest images",
    longDescription: "Fetch up to 70 Pinterest images using your custom API",
    category: "fun",
    guide: "{p}pinterest <keywords> - <amount>",
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("❌ Provide keywords.\nUsage: pinterest <keywords> - <amount>");
    }

    // 🔥 Last argument = amount
    let amount = 1;
    const lastArg = args[args.length - 1];

    if (!isNaN(parseInt(lastArg))) {
      amount = parseInt(lastArg);
      args.pop();
    }

    if (amount < 1) amount = 1;
    if (amount > 70) amount = 70;

    // 🔥 Multi-word keywords
    const query = args.join(" ");

    const apiUrl = `https://denish-pin.vercel.app/api/search-download?query=${encodeURIComponent(query)}`;

    try {
      const res = await axios.get(apiUrl);
      const data = res.data?.data || [];

      if (!data.length) {
        return message.reply("❌ No results found.");
      }

      const images = data.slice(0, amount);

      // 🔥 Convert URLs to streams
      const attachments = await Promise.all(
        images.map(async (url) => {
          const response = await axios.get(url, { responseType: "stream" });
          return response.data;
        })
      );

      // 🖼️ **Send only images — no text**
      await message.reply({
        attachment: attachments
      });

    } catch (error) {
      console.error("Pinterest error:", error);
      message.reply("❌ Error fetching images.");
    }
  },
};
