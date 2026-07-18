const {
  Client,
  Events,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const { readJson, writeJson } = require('../utils/dataStore');

let client = null;
let status = {
  state: process.env.DISCORD_TOKEN ? 'starting' : 'disabled',
  guildId: process.env.DISCORD_GUILD_ID || null,
  guildName: null,
  userTag: null,
  lastEventAt: null,
  lastError: null
};

const activeGames = new Map();

function getDiscordBotStatus() {
  return { ...status, connected: status.state === 'ready' };
}

function saveRecord(fileName, record, key) {
  const records = readJson(fileName, []);
  const index = records.findIndex((item) => item[key] === record[key]);

  if (index >= 0) records[index] = { ...records[index], ...record };
  else records.unshift(record);

  writeJson(fileName, records.slice(0, 2000));
}

function saveChannel(channel) {
  if (!channel?.id || !channel.guild) return;

  saveRecord('discordChannels.json', {
    id: channel.id,
    name: channel.name,
    type: channel.isVoiceBased() ? 'voice' : 'text',
    topic: channel.topic || ''
  }, 'id');
}

function saveMember(member) {
  if (!member?.user?.id) return;

  saveRecord('discordMembers.json', {
    id: member.user.id,
    displayName: member.displayName || member.user.username,
    discordTag: member.user.tag || member.user.username,
    roles: member.roles?.cache ? member.roles.cache.map((role) => role.name).filter((name) => name !== '@everyone') : [],
    joinedAt: member.joinedAt?.toISOString() || new Date().toISOString()
  }, 'id');
}

function handleMessage(message) {
  if (!message.guild || message.author.bot || !message.content?.trim()) return;

  saveChannel(message.channel);
  saveMember(message.member);
  saveRecord('discordMessages.json', {
    id: message.id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    authorId: message.author.id,
    authorDiscordId: message.author.id,
    createdAt: message.createdAt.toISOString(),
    content: message.content.slice(0, 4000),
    reactions: message.reactions.cache.reduce((total, reaction) => total + reaction.count, 0),
    replyCount: 0
  }, 'id');

  status.lastEventAt = new Date().toISOString();
}

function saveGameSession(userId, game, startedAt, minutes) {
  saveRecord('gameSessions.json', {
    id: `discord_${userId}_${startedAt}`,
    userId,
    game,
    startedAt,
    minutes: Math.max(1, Math.round(minutes)),
    party: [],
    channelId: null
  }, 'id');
}

function handlePresenceUpdate(oldPresence, newPresence) {
  const member = newPresence?.member || oldPresence?.member;
  if (!member || member.user.bot) return;

  const game = newPresence?.activities?.find((activity) => activity.type === 0)?.name || null;
  const previous = activeGames.get(member.id);

  if (previous && previous.game !== game) {
    saveGameSession(member.id, previous.game, previous.startedAt, (Date.now() - previous.startedMs) / 60000);
    activeGames.delete(member.id);
  }

  if (game && !activeGames.has(member.id)) {
    activeGames.set(member.id, {
      game,
      startedAt: new Date().toISOString(),
      startedMs: Date.now()
    });
  }

  saveMember(member);
  status.lastEventAt = new Date().toISOString();
}

async function applyModerationAction({ guildId, userId, action, reason }) {
  if (!client || !client.isReady()) return { state: 'not_connected' };
  if (!guildId || !/^\d{15,25}$/.test(String(userId))) return { state: 'skipped', reason: 'Discord member id is unavailable.' };

  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    if (action === 'timeout' || action === 'suspend') {
      const duration = action === 'suspend' ? 7 * 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
      await member.timeout(duration, reason);
      return { state: 'applied', action, userId, durationMs: duration };
    }

    return { state: 'recorded', action };
  } catch (error) {
    return { state: 'failed', message: error.message };
  }
}

function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.log('Discord bot disabled: DISCORD_TOKEN is not configured.');
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel]
  });

  client.once(Events.ClientReady, (readyClient) => {
    const guild = process.env.DISCORD_GUILD_ID ? readyClient.guilds.cache.get(process.env.DISCORD_GUILD_ID) : null;
    status = {
      ...status,
      state: 'ready',
      guildName: guild?.name || null,
      userTag: readyClient.user.tag,
      lastError: null
    };
    console.log(`Discord bot ready as ${readyClient.user.tag}`);
  });

  client.on(Events.MessageCreate, handleMessage);
  client.on(Events.PresenceUpdate, handlePresenceUpdate);
  client.on(Events.Error, (error) => {
    status = { ...status, state: 'error', lastError: error.message };
    console.error('Discord client error:', error.message);
  });

  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    status = { ...status, state: 'error', lastError: error.message };
    console.error('Discord login failed:', error.message);
  });

  return client;
}

module.exports = {
  startDiscordBot,
  getDiscordBotStatus,
  applyModerationAction
};
