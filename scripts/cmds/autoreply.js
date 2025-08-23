const awayMessages = [
  "Lord Axshu is away right now, please wait for his reply.",
  "He’s not available at the moment, check back later.",
  "Axshu will reply soon, he’s currently offline.",
  "Hold on! Lord Axshu isn’t here right now.",
  "He’s AFK. Try again in a while."
];

let lastMessageTime = Date.now();

module.exports = {
  config: {
    name: "afkdetector",
    version: "1.0",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Auto reply when Axshu is inactive",
    longDescription: "If someone mentions Axshu or says his name while he is inactive for 5 minutes, the bot will reply automatically.",
    category: "utility",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function () {},

  onChat: async function({ event, message, api }) {
    const mentionId = "100029144730729"; // Your UID
    const text = event.body?.toLowerCase() || "";

    // Update last message time if owner sends message
    if (event.senderID === mentionId) {
      lastMessageTime = Date.now();
      return;
    }

    // Check inactivity (5 minutes = 300000 ms)
    const inactive = Date.now() - lastMessageTime >= 300000;

    if (inactive) {
      const mentionedOwner = event.mentions && event.mentions[mentionId];
      const calledName = text.includes("denish");

      if (mentionedOwner || calledName) {
        const randomMsg = awayMessages[Math.floor(Math.random() * awayMessages.length)];
        message.reply(randomMsg);
      }
    }
  }
};
