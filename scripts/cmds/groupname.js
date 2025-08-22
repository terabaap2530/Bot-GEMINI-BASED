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
    version: "1.2",
    author: "Lord Denish + Modified Silent",
    countDown: 5,
    role: 2, // only bot admin
    shortDescription: "Lock/Unlock group name silently",
    longDescription: "Set and lock the group name. Use 'off' to unlock. Works silently without notifications.",
    category: "group",
    guide: "{pn} [new name | off]"
  },

  onStart: async function ({ api, event, args }) {
    const data = loadData();
    const { threadID } = event;

    if (!args[0]) return;

    const input = args.join(" ");

    // Unlock system
    if (input.toLowerCase() === "off" || input.toLowerCase() === "unlock") {
      if (data[threadID]) {
        delete data[threadID];
        saveData(data);
      }
      return;
    }

    // Lock system
    const newName = input;
    data[threadID] = newName;
    saveData(data);

    await api.setTitle(newName, threadID);
  },

  // Detect if someone changes the group name
  onEvent: async function ({ api, event }) {
    if (event.logMessageType === "log:thread-name") {
      const data = loadData();
      const { threadID, logMessageData, author } = event;

      // If lock not enabled → do nothing
      if (!data[threadID]) return;

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

        // Otherwise, reset name silently
        await api.setTitle(savedName, threadID);
      }
    }
  }
};
