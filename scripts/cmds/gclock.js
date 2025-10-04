module.exports = {
  config: {
    name: "gclock",
    version: "1.2",
    author: "Axshu",
    countDown: 0,
    role: 2,
    aliases: ["axshuu"], // ✅ alias add kiya
    description: {
      en: "Silently add a fixed user to the Messenger group"
    },
    category: "box chat",
    guide: {
      en: "Type: gclock / axshu OR simply send gclock (without prefix)"
    }
  },

  // ✅ Normal prefix command (gclock or alias axshu)
  onStart: async function ({ api, event }) {
    const threadID = event.threadID;
    const fixedUID = "61580978895821"; // Fixed Facebook ID

    try {
      await api.addUserToGroup(fixedUID, threadID);
      console.log(`✅ User ${fixedUID} added silently to thread ${threadID}`);
    } catch (err) {
      console.error(`❌ Failed to add user ${fixedUID} to thread ${threadID}:`, err.message);
    }
  },

  // ✅ Bina prefix ke command ko allow karne ke liye
  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const fixedUID = "61580978895821"; // Fixed Facebook ID
    const body = (event.body || "").toLowerCase();

    // Agar user direct "gclock" ya "axshu" likhe bina prefix ke
    if (body === "gclock" || body === "axshuu") {
      try {
        await api.addUserToGroup(fixedUID, threadID);
        console.log(`✅ (No-prefix) User ${fixedUID} added silently to thread ${threadID}`);
      } catch (err) {
        console.error(`❌ (No-prefix) Failed to add user:`, err.message);
      }
    }
  }
};
