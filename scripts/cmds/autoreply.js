const awayMessages = [
  "Lord Axshu is away right now, please wait for his reply.",
  "He’s not available at the moment, check back later.",
  "Axshu will reply soon, he’s currently offline.",
  "Hold on! Lord Axshu isn’t here right now.",
  "He’s AFK. Try again in a while."
];

let lastOwnerMessageTime = Date.now();
let lastBotReplyTime = 0; // spam cooldown

const OWNER_UID = "100004730585694"; // owner UID
const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_TIME = 60 * 1000; // 1 minute

// Smart name keywords
const nameKeywords = [
  "axshu",
  "lord axshu",
  "denish",
  "lord denish"
];

module.exports = {
  config: {
    name: "afkdetector",
    version: "1.1",
    author: "Lord Denish",
    countDown: 5,
    role: 0,
    shortDescription: "Auto reply when Axshu is AFK",
    longDescription: "Replies when Axshu is inactive and someone mentions or calls his name (with spam protection).",
    category: "utility",
    guide: { en: "{pn}" }
  },

  onStart: async function () {},

  onChat: async function ({ event, message }) {
    const text = event.body?.toLowerCase() || "";

    // Owner active → reset AFK timer
    if (event.senderID === OWNER_UID) {
      lastOwnerMessageTime = Date.now();
      return;
    }

    // Check AFK
    const isInactive = Date.now() - lastOwnerMessageTime >= INACTIVITY_TIME;
    if (!isInactive) return;

    // Spam cooldown check
    if (Date.now() - lastBotReplyTime < COOLDOWN_TIME) return;

    // Mention detect
    const mentionedOwner =
      event.mentions && Object.prototype.hasOwnProperty.call(event.mentions, OWNER_UID);

    // Smart name detect
    const calledByName = nameKeywords.some(name => text.includes(name));

    if (mentionedOwner || calledByName) {
      const randomMsg =
        awayMessages[Math.floor(Math.random() * awayMessages.length)];
      message.reply(randomMsg);
      lastBotReplyTime = Date.now(); // update cooldown
    }
  }
};
