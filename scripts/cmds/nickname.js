const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "nicknames.json");

// Load stored nicknames
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return {};
  }
}

// Save stored nicknames
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  config: {
    name: "nicknamelock",
    aliases: ["nlock", "permanick"],
    version: "4.3",
    author: "Lord Denish",
    countDown: 5,
    role: 2, // only bot admin
    shortDescription: "Set & lock all nicknames silently",
    longDescription: "Lock a nickname for all members silently, with delay and skip logic.",
    category: "group",
    guide: "{pn} <nickname> | off"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID } = event;
    const data = loadData();

    if (!args[0]) return;

    // Turn off lock
    if (args[0].toLowerCase() === "off") {
      if (data[threadID]) {
        data[threadID].locked = false;
        saveData(data);
      }
      return;
    }

    // Set and lock one nickname for all
    const newNick = args.join(" ");
    const threadInfo = await api.getThreadInfo(threadID);

    if (!data[threadID]) data[threadID] = { locked: true, nicks: {}, uniform: true };

    for (const uid of threadInfo.participantIDs) {
      // Check current nickname
      const currentNick = threadInfo.nicknames && threadInfo.nicknames[uid] ? threadInfo.nicknames[uid] : "";

      if (currentNick !== newNick) {
        await api.changeNickname(newNick, threadID, uid);
        await delay(20000); // 20 sec delay per user
      }

      data[threadID].nicks[uid] = newNick;
    }

    data[threadID].locked = true;
    data[threadID].uniform = true;
    data[threadID].defaultNick = newNick;
    saveData(data);
  },

  onEvent: async function ({ api, event }) {
    const data = loadData();
    const { threadID } = event;

    if (!data[threadID] || !data[threadID].locked) return;

    // Nickname change detect
    if (event.logMessageType === "log:user-nickname") {
      const { nickname, participant_id } = event.logMessageData;

      if (data[threadID].uniform) {
        const lockedNick = data[threadID].defaultNick;

        if (nickname !== lockedNick) {
          const botAdmins = ["1000xxxxxxxxxx", "1000yyyyyyyyyy"]; // <-- Put your FB UIDs here
          if (botAdmins.includes(event.author)) {
            data[threadID].defaultNick = nickname; // admin updated lock
            saveData(data);
            return;
          }

          // ✅ Add 10-second delay before reverting nickname
          await delay(10000); // 10 seconds
          // Check again after 10 sec (maybe user changed multiple times)
          const threadInfo = await api.getThreadInfo(threadID);
          const currentNickAfterDelay = threadInfo.nicknames && threadInfo.nicknames[participant_id]
            ? threadInfo.nicknames[participant_id]
            : "";

          if (currentNickAfterDelay !== lockedNick) {
            await api.changeNickname(lockedNick, threadID, participant_id);
          }
        }
      }
    }

    // New member added → give same nickname silently
    if (event.logMessageType === "log:subscribe") {
      if (!data[threadID].uniform) return;

      const lockedNick = data[threadID].defaultNick;
      for (const user of event.logMessageData.addedParticipants) {
        const uid = user.userFbId;
        await api.changeNickname(lockedNick, threadID, uid);
        data[threadID].nicks[uid] = lockedNick;
      }
      saveData(data);
    }
  }
};
