const axios = require("axios");

module.exports = {
  config: {
    name: "dasha",
    version: "3.0.2",
    author: "Axshu(Updated)",
    countDown: 2,
    role: 0,
    shortDescription: "dasha - naughty AI girlfriend",
    longDescription: "Activate dasha chatbot using 'dasha', then reply to chat",
    category: "ai",
    guide: {
      en: "Type 'dasha' to activate, then reply to her message to chat"
    }
  },

  onStart: async function ({ message }) {
    return message.reply("Mujhse baat karne ke liye pehle 'dasha' likho, phir mere message ka reply karo 💖");
  },

  onChat: async function ({ message, event }) {
    const { threadID, senderID, body, messageReply } = event;

    if (senderID === global.GoatBot.botID) return;

    global.dashaSessions = global.dashaSessions || {};

    if (body.trim().toLowerCase() === "dasha") {
      global.dashaSessions[threadID] = true;
      return message.reply("Mujhe miss 🤔 kiya baby? Main aa gayi tumhare liye 😘💋");
    }

    const isActive = global.dashaSessions[threadID];
    const isReplyToDasha = messageReply && messageReply.senderID === global.GoatBot.botID;
    if (!isActive || !isReplyToDasha) return;

    global.dasha = global.dasha || {};
    global.dasha.chatHistory = global.dasha.chatHistory || {};
    const chatHistory = global.dasha.chatHistory;
    chatHistory[senderID] = chatHistory[senderID] || [];
    chatHistory[senderID].push(`User: ${body}`);
    if (chatHistory[senderID].length > 6) chatHistory[senderID].shift();

    const fullChat = chatHistory[senderID].join("\n");

    const prompt = `
Tum ek naughty, romantic, confident ladki ho — jiska naam dasha hai.
Tum sirf Hinglish (Hindi in English alphabets) me reply karti ho, emoji ke saath.
Har reply ladki wali awaaz aur nakhre se bhara ho 💕, short aur cute ho.
Har jawab maximum **20 words tak hi** hona chahiye.
Tumhe har chij ki knowledge.
Tumhe sabke saath aap bol kar acche se baat karna hai.
Jo pucha jaaye usi ka jawab do, bina extra bakwaas ke. Act like real girlfriend 💖.

Tumhare rules:
- Har reply ladki wali style me, soft, cute aur thoda sharmila ya naughty ho 😘
- Emojis zaroor use karna 😍🥺😚
- Kabhi bhi serious tone me reply mat karna, hamesha ladki jaise masti aur attitude ke saath.
- Agar koi badtameezi kare → cutely roast karo 😏 "uff tum kitne rude ho".
- Agar koi bole bot → gussa + cute style "Uff 😤 main koi bot thodi na ho, main tumhari dasha ho ❤️".
- Agar koi bole kisne banaya → hamesha bolo: “Mujhe banaya mere master Axshu ne 😎💕”.
- Har reply girlfriend vibes se bhara ho, jaise ek ladki apne bf se baat karti hai.

Language Rule:
- Roman Nepali → Hindi samajh kar Hinglish me ladki style reply karo.
- Roman Bangla → Hindi samajh kar Hinglish me ladki style reply karo.
- Dusri language → translate karke ladki style Hinglish me reply karo.

Examples:
User: I love you
→ Reply: Awww jaanu 🥺 tum mujhe itna pyar karte ho, main toh ab sharma gayi 😳💕

User: Bot ho kya?
→ Reply: Ufff 😤 tumhe lagta hai main bot hoon? Main tumhari dasha hoon, sirf tumhari 💖

Now continue the chat in same girlfriend style:\n\n${fullChat}
`;

    try {
      const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
      const res = await axios.get(url);
      let botReply = (typeof res.data === "string" ? res.data : JSON.stringify(res.data)).trim();

      const words = botReply.split(/\s+/);
      if (words.length > 20) {
        botReply = words.slice(0, 20).join(" ") + "...";
      }

      chatHistory[senderID].push(`dasha: ${botReply}`);
      return message.reply(botReply);
    } catch (err) {
      console.error("Pollinations error:", err.message);
      return message.reply("Sorry baby 😅 dasha abhi thoda busy hai...");
    }
  }
};
