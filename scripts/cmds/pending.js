const axios = require("axios");
const fs = require("fs");

module.exports = {
 config: {
   name: "pending",
   aliases: ['pend'],
   version: "1.0",
   author: "Lord Itachi",
   countDown: 5,
   role: 2,
   shortDescription: "Accept pending message",
   longDescription: "Accept pending message",
   category: "Utility",
 },

 onReply: async function ({ message, api, event, usersData, Reply }) {
   const { author, pending } = Reply;
   if (String(event.senderID) !== String(author)) return;
   const { body, threadID, messageID } = event;

   if (!body) return api.sendMessage("[ ERR ] Invalid response!", threadID, messageID);

   if (body.startsWith("c")) {
     return api.sendMessage(`[ OK ] Successfully canceled`, threadID, messageID);
   }

   let indices = body.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0 && n <= pending.length);
   if (indices.length === 0) return api.sendMessage("[ ERR ] No valid numbers provided!", threadID, messageID);

   api.unsendMessage(messageID);

   const filePath = __dirname + "/assets/box.mp4";
   const downloadUrl = "https://drive.google.com/uc?export=download&id=19D0PcMNOsIY3kniXDq3tlQIh7UG-YLVe";

   try {
     const response = await axios({ method: "GET", url: downloadUrl, responseType: "stream" });
     const writer = fs.createWriteStream(filePath);
     response.data.pipe(writer);

     writer.on("finish", async () => {
       for (const i of indices) {
         let threadID = pending[i - 1].threadID;
         api.changeNickname(`[ ${global.GoatBot.config.prefix} ] ${global.GoatBot.config.nickNameBot || "Bot"}`, threadID, api.getCurrentUserID());
         api.sendMessage(
           { body: `${global.GoatBot.config.nickNameBot} Bot is now connected! Use ${global.GoatBot.config.prefix}help to see the command list.`, attachment: fs.createReadStream(filePath) },
           threadID
         );
       }
       api.sendMessage(`[ OK ] Successfully approved ${indices.length} thread(s)!`, threadID, messageID);
     });

     writer.on("error", (error) => {
       api.sendMessage("[ ERR ] Failed to process file!", threadID, messageID);
       console.error(error);
     });
   } catch (error) {
     api.sendMessage("[ ERR ] Failed to download the file!", threadID, messageID);
     console.error(error);
   }
 },

 onStart: async function ({ message, api, event, args, usersData }) {
   if (!args.length) {
     return api.sendMessage("❯ You can use pending:\n❯ pending user: User queue\n❯ pending thread: Group queue\n❯ pending all: All boxes waiting for approval", event.threadID, event.messageID);
   }

   const { threadID, messageID, senderID } = event;
   const permission = global.GoatBot.config.adminBot;
   if (!permission.includes(senderID)) return api.sendMessage("[ OPPS ] You don't have permission to use this command!", threadID, messageID);

   let listType = args[0].toLowerCase();
   let msg = "", index = 1, list = [];

   try {
     let spam = await api.getThreadList(100, null, ["OTHER"]) || [];
     let pending = await api.getThreadList(100, null, ["PENDING"]) || [];
     let combinedList = [...spam, ...pending];

     if (listType === "user" || listType === "u" || listType === "-u") {
       list = combinedList.filter(t => !t.isGroup);
     } else if (listType === "thread" || listType === "t" || listType === "-t") {
       list = combinedList.filter(t => t.isGroup && t.isSubscribed);
     } else {
       return api.sendMessage("[ ERR ] Invalid option! Use 'user' or 'thread'.", threadID, messageID);
     }
   } catch (e) {
     return api.sendMessage("[ ERR ] Can't get the current list.", threadID, messageID);
   }

   for (const single of list) {
     const name = listType === "user" ? await usersData.getName(single.threadID) : single.name || "Unknown";
     msg += `${index++}. ${name} (${single.threadID})\n`;
   }

   if (list.length) {
     return api.sendMessage(`❯ Total ${list.length} ${listType}(s) pending approval:\n\n${msg}\nReply with numbers to approve.`, threadID, (error, info) => {
       global.GoatBot.onReply.set(info.messageID, { commandName: this.config.name, messageID: info.messageID, author: senderID, pending: list });
     }, messageID);
   } else {
     return api.sendMessage(`[ - ] No ${listType}(s) pending approval.`, threadID, messageID);
   }
 }
};
