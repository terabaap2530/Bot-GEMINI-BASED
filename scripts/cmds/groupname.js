const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "groupNames.json");

// Load stored group names
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return {};
  }
}

// Save stored group names
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "groupname",
    aliases: ["gcname", "permagc"],
    version: "1.0",
    author: "Lord Denish",
    countDown: 5,
    role: 2, // only bot admin
    shortDescription: "Lock group name",
    longDescription: "Set and lock the group name. Only bot admin can change it.",
    category: "group",
    guide: "{pn} [new name]"
  },

  onStart: async function ({ api, event, args }) {
    const data = loadData();
    const { threadID } = event;

    if (!args[0]) {
      return api.sendMessage("⚡ Usage: groupname <new name>", threadID);
    }

    const newName = args.join(" ");
    data[threadID] = newName;
    saveData(data);

    await api.setTitle(newName, threadID);
    api.sendMessage(`✅ Group name locked as: ${newName}`, threadID);
  },

  // Detect if someone changes the group name
  onEvent: async function ({ api, event }) {
    if (event.logMessageType === "log:thread-name") {
      const data = loadData();
      const { threadID, logMessageData, author } = event;

      // Auto store group if bot newly added
      if (!data[threadID]) {
        data[threadID] = logMessageData.name;
        saveData(data);
        return;
      }

      const savedName = data[threadID];
      const newName = logMessageData.name;

      if (savedName !== newName) {
        // If change was made by bot admin (allowed)
        const botAdmins = ["1000xxxxxxxxxx", "1000yyyyyyyyyy"]; // <-- put your FB userIDs here
        if (botAdmins.includes(author)) {
          data[threadID] = newName;
          saveData(data);
          return;
        }

        // Otherwise, reset name
        await api.setTitle(savedName, threadID);
        api.sendMessage(
          `⚠️ Group name is locked as: ${savedName}\n❌ Only bot admin can change it.`,
          threadID
        );
      }
    }
  }
};
