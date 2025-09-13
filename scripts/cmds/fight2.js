const TIMEOUT_SECONDS = 120;
const ongoingFights = new Map();
const gameInstances = new Map();

module.exports = {
  config: {
    name: "fight2",
    version: "1.0",
    author: "Lord Itachi",
    role: 0,
    shortDescription: { en: "Wizard battle with your friends!" },
    longDescription: { en: "Duel your friends using magical spells and see who's the greatest wizard!" },
    category: "🎮 Game",
    guide: "{prefix}fight2 @mention",
  },

  onStart: async function ({ event, message, api, usersData }) {
    const threadID = event.threadID;
    if (ongoingFights.has(threadID)) return message.send("🧙‍♂️ A magic duel is already ongoing here.");

    const mention = Object.keys(event.mentions);
    if (mention.length !== 1) return message.send("🧙 Please mention one friend to start a magic duel.");

    const challengerID = event.senderID;
    const opponentID = mention[0];

    const challenger = await usersData.getName(challengerID);
    const opponent = await usersData.getName(opponentID);

    const fight = {
      participants: [
        { id: challengerID, name: challenger, hp: 100 },
        { id: opponentID, name: opponent, hp: 100 }
      ],
      currentPlayer: Math.random() < 0.5 ? challengerID : opponentID,
      threadID
    };

    const gameInstance = {
      fight,
      lastAttack: null,
      lastPlayer: null,
      timeoutID: null,
      turnMessageSent: false,
    };

    gameInstances.set(threadID, gameInstance);
    startFight(message, fight);
    startTimeout(threadID, message);
  },

  onChat: async function ({ event, message }) {
    const threadID = event.threadID;
    const gameInstance = gameInstances.get(threadID);
    if (!gameInstance) return;

    const { fight } = gameInstance;
    const currentPlayerID = fight.currentPlayer;
    const currentPlayer = fight.participants.find(p => p.id === currentPlayerID);
    const opponent = fight.participants.find(p => p.id !== currentPlayerID);

    const move = event.body.trim().toLowerCase();
    const isCurrentPlayer = event.senderID === currentPlayerID;

    if (!["fireball", "ice spike", "lightning", "heal"].includes(move)) return;

    if (!isCurrentPlayer) return message.reply(`🕒 It's ${currentPlayer.name}'s turn! Wait for your turn.`);

    if (move === "heal") {
      const healAmount = Math.floor(Math.random() * 11) + 15;
      currentPlayer.hp = Math.min(100, currentPlayer.hp + healAmount);
      message.send(`💖 ${currentPlayer.name} casts Heal and recovers ${healAmount} HP!\n\n${currentPlayer.name}: ${currentPlayer.hp} HP\n${opponent.name}: ${opponent.hp} HP`);
    } else {
      const damage = Math.floor(Math.random() * 21) + 10;
      opponent.hp -= damage;
      message.send(`✨ ${currentPlayer.name} uses ${move.toUpperCase()} and hits ${opponent.name} for ${damage} damage!\n\n${currentPlayer.name}: ${currentPlayer.hp} HP\n${opponent.name}: ${opponent.hp} HP`);
    }

    if (opponent.hp <= 0) {
      message.send(`🏆 ${currentPlayer.name} wins the wizard duel! ${opponent.name} has been defeated.`);
      return endFight(threadID);
    }

    fight.currentPlayer = opponent.id;
    gameInstance.lastAttack = move;
    gameInstance.lastPlayer = currentPlayer;
    gameInstance.turnMessageSent = false;
    message.send(`🔁 It's now ${opponent.name}'s turn.`);
  },
};

function startFight(message, fight) {
  ongoingFights.set(fight.threadID, fight);
  const [p1, p2] = fight.participants;
  const starter = fight.currentPlayer === p1.id ? p1 : p2;
  const opponent = fight.currentPlayer === p1.id ? p2 : p1;

  message.send(
    `🧙‍♂️ ${starter.name} has challenged ${opponent.name} to a magic duel!\n\n` +
    `Spells: fireball, ice spike, lightning, heal\n\n` +
    `Both start with 100 HP.\n` +
    `🔥 It's ${starter.name}'s turn!`
  );
}

function startTimeout(threadID, message) {
  const timeoutID = setTimeout(() => {
    const game = gameInstances.get(threadID);
    if (!game) return;

    const [p1, p2] = game.fight.participants;
    const winner = p1.hp > p2.hp ? p1 : p2;
    const loser = p1.hp > p2.hp ? p2 : p1;

    message.send(`⏰ Time's up! ${winner.name} wins the duel with higher HP!\n${loser.name} is defeated.`);
    endFight(threadID);
  }, TIMEOUT_SECONDS * 1000);

  gameInstances.get(threadID).timeoutID = timeoutID;
}

function endFight(threadID) {
  const instance = gameInstances.get(threadID);
  if (instance?.timeoutID) clearTimeout(instance.timeoutID);
  ongoingFights.delete(threadID);
  gameInstances.delete(threadID);
        }
