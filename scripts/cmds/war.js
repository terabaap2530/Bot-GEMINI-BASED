const activeLoops = {}; // Store active war loops per thread

module.exports = {
	config: {
		name: "war",
		version: "2.0",
		author: "LAWTIET",
		role: 2,
		category: "texts",
		guide: {
			en: "war @(mention) o|f"
		} 
	},

	onStart: async function ({ api, event, args }) {
		const mention = Object.keys(event.mentions)[0];
		if (!mention) return api.sendMessage("⚠️ Tag 1 friend to start or stop the war.", event.threadID);

		const name = event.mentions[mention];
		const arraytag = [{ id: mention, tag: name }];
		const action = args[args.length - 1]?.toLowerCase();

		const messages = [
			`RANDIKO CHOKTAA MUJII RAUTEE KHATE KO XORO AMA CHIKWAA MUJI ${name}`,
			`LADOOO LES TAT TC TAUKEE SALLAA XKKKAAA TEORO PUTI MA MERO NAM LEKHXU ABAA😭💋 ${name}`,
			`TEORO AMA KO PUTI MA DAHI HALERW LYAAMM LYAM CHIKAMAMMM BHNNTW🤠❤ ${name}`,
			`RANDIIIIIIIIIK OOOOORAGATTTTT VELEEEEEEEE KLKOOOOOOO XOTOOOO🤪🤣 ${name}`,
			`TERIIIIIIIII AAAAMAAAAAAAAA KOOOO TCCC MAAAA MEERTOOOOO LADOOOOOO RANDIIIII XOROOOOOOO🥰💗 ${name}`,
			`TEEIIIIIIIII AAAMAAAA KALOOOOOO TCCCCC RAMDUUUUU KKOOOOO XOTOOOOO 😏💪🏻 ${name}`,
			`VELEEEEEEE TEROOOOOO AAAMAAAAA KAIIIII LADOOO CHSAKOOOO HUUUU MUJIIII ${name}`,
			`TEEOOOOO GIRLFRIEND KOOO PUTIIII MAAAA MERROOOOOO LADOOOOOO LOMMM LOMMMMM MUJIIII ${name}`,
			`RANDIIIIIIIIII KOOOOOOO RAGATTTTTTTTTT VELEEEEEEEEE KOOOOOOOOO AAULDDDDDDDD RYUKEN BAU HU TEROO 😜🎀 ${name}`,
			`RYUKEN KO HO VANERAA TEROOOO AAMAAA LAIII SODHHHH MXAIKNEE ${name}`,
			`RANDIIIIIII KOOOOOO XOROOOOO MUJIIII AAKATTTTTT BANAAA ${name}`,
			`TEROOOOO AAAMAAA LAIIII FERIIIII PHATAAA CHIKXUUUU 😘👌🏻 ${name}`,
			`DALITTTTTTT KOOOOO XOTOOOOOO HOSSSS MUJIIIII KAMIIIII KOOOO AAUALDDD 🙄🙄 ${name}`,
			`MUJIIIII TEROOOOO PURAIIII KHANDANN LAIII NAMGOOO NACHAUNXU 😂 ${name}`,
			`MUJIIIII RANDIIIII TEROOOO AAMAA LAII CHEKERAAAA TALAIII JANMAKOOOOO VELEEE BUJHISSS ${name}`,
			`🤍RANDIIIII KOOOOO XOROOO TEROOOO AAMAAA KOO GANDDD MAA BEER 🍺 KO BOTTLEE XIRAUNXUU ${name}`,
			`VELEEEE XOROOOO BAUU KIO NAME YAD GARR " RYUKEN " 🤍😂🍺 ${name}`,
			`RANDIIIIIKAAAAA AAULDDD SALEEE TEROOO AAUKATTT XAINA MUJII 🙁❤️ ${name}`,
			`RANDIIII LOOP MA FASIS MUJIII CHIKNEEE KOOO XOROOO MCCC 🤣🎀 ${name}`,
			`BAPP SEEE PANGAAA PADEGAAA VARIII MUJIII 🤣🤣 ${name}`,
			`BAPPP BAPPP HOTAA HAAA VELEEEEE KAAA XOROOOO 🙀💗 ${name}`,
			`TERIIII AAMAA LADOOO BINAA MARII SAKIII MUJIII MEROO LAFOO DEE TEROOO AAMA LAIII 🌚🎀 ${name}`,
			`DALITTTTTT RANDIIII KOOOOO XOROOOOOO LADOOOOO LESSS KAMIII XOROOO 🤣 ${name}`,
			`RANDIIIIII KOOOOO RAGATTTTTT TEROOOO AANAA THAMELL KOO VALUUU HOOO RANDIII KOOOO XOROOO MUJII 💗🥵 ${name}`,
			`TEROO BAINEE KOO PUTIII MAAA MEROOO LADOOO LOM LOMMM 😹🤍 ${name}`,
			`KAMIIII8 KOOOOOO XOROOOOOO SALEEEEE DALITTTTTT GWARRRRR KAAAA BAXAAA SUWARRRR 🤣🤍😹 ${name}`,
			`VELEEEEE KAMIIIIIII BAXAAAAAAA BAUUUUU SANGAAA NEW KHOJXASSSS XOROOOOO RANDIIII AAULDDD 🍺🙄 ${name}`,
			`TALAIIII JANMAKOOO TERIII AAMAAA LAII SODHHH TYOOO VALUUU HOOO VANERAAA 😂😂 ${name}`,
			`😜 CHIKNEYYYYY BAPPPPPP KEEE AAGEE BOLEGAAAAA RANDIIIII KAAA RAGATTTTTTT BETEEEEEE RANDDDDD CHODAAAAAA 🤪❤️ ${name}`,
			`GWARRRRRR KOOOOO XOTOOOOO GWARRRRRR NAIIIIII RAIXAAAAS TYPEE NAHANNN XOROOOO SAKDAINASSS CPP LE NI SAKDAINAS 🙁🫂 ${name}`
		];

		// Turn ON war
		if (action === "o") {
			if (activeLoops[event.threadID]) {
				return api.sendMessage("⚠️ War is already running in this chat!", event.threadID);
			}

			let messageIndex = 0;
			const intervalTime = 5000; // 5 seconds delay

			const loop = setInterval(() => {
				if (messageIndex >= messages.length) messageIndex = 0;
				api.sendMessage({ body: messages[messageIndex], mentions: arraytag }, event.threadID);
				messageIndex++;
			}, intervalTime);

			activeLoops[event.threadID] = loop;
			return api.sendMessage(`⚔️ War started against ${name}!`, event.threadID);
		}

		// Turn OFF war
		if (action === "f") {
			if (!activeLoops[event.threadID]) {
				return api.sendMessage("⚠️ No war is currently running in this chat.", event.threadID);
			}
			clearInterval(activeLoops[event.threadID]);
			delete activeLoops[event.threadID];
			return api.sendMessage(`🛑 War stopped against ${name}.`, event.threadID);
		}

		// Wrong usage
		return api.sendMessage("📌 Use:\nwar @mention o → start war\nwar @mention f → stop war", event.threadID);
	}
};
