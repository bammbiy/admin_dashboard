const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { readJson, writeJson } = require('../utils/dataStore');
const { writeAuditLog } = require('../utils/audit');
const { getDiscordBotStatus, applyModerationAction } = require('../bot/discordBot');
const {
  buildKeywordTracker,
  buildModerationQueue,
  buildSignalMap,
  buildGameAnalytics
} = require('../utils/intelligenceEngine');

function getDiscordData() {
  return {
    messages: readJson('discordMessages.json', []),
    channels: readJson('discordChannels.json', []),
    members: readJson('discordMembers.json', []),
    sessions: readJson('gameSessions.json', []),
    users: readJson('users.json', []),
    actions: readJson('moderationActions.json', [])
  };
}

router.get('/keyword-tracker', authMiddleware, (req, res) => {
  const { messages, channels, members } = getDiscordData();
  res.json(buildKeywordTracker(messages, channels, members, req.query.keyword));
});

router.get('/signal-map', authMiddleware, (req, res) => {
  const { messages, channels, members } = getDiscordData();
  res.json(buildSignalMap(messages, channels, members, req.query.keyword));
});

router.get('/moderation-queue', authMiddleware, (req, res) => {
  const { messages, channels, members, actions } = getDiscordData();
  res.json(buildModerationQueue(messages, channels, members, actions));
});

router.get('/game-analytics', authMiddleware, (req, res) => {
  const { sessions, messages, members } = getDiscordData();
  res.json(buildGameAnalytics(sessions, messages, members));
});

router.get('/discord-status', authMiddleware, (req, res) => {
  res.json(getDiscordBotStatus());
});

router.post('/moderation-queue/:targetId/action', authMiddleware, requireRole('manager'), async (req, res) => {
  const { targetId } = req.params;
  const { action, reason } = req.body;
  const allowedActions = ['warn', 'timeout', 'suspend', 'ignore'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ message: 'Unsupported moderation action.' });
  }

  const { messages, users, actions } = getDiscordData();
  const target = messages.find((message) => message.id === targetId);

  if (!target) {
    return res.status(404).json({ message: 'Moderation target not found.' });
  }

  const nextAction = {
    id: `act_${Date.now()}`,
    targetId,
    status: action === 'ignore' ? 'ignored' : 'resolved',
    action,
    reason: reason || 'Moderator decision',
    actor: req.session.user.username,
    createdAt: new Date().toISOString()
  };
  const nextActions = [nextAction, ...actions.filter((item) => item.targetId !== targetId)];

  if (action === 'suspend' || action === 'timeout') {
    const user = users.find((item) => item.id === target.authorId);

    if (user && user.username !== req.session.user.username) {
      user.status = action === 'timeout' ? 'timeout' : 'suspended';
      writeJson('users.json', users);
    }
  }

  const botResult = await applyModerationAction({
    guildId: target.guildId,
    userId: target.authorDiscordId || target.authorId,
    action,
    reason: nextAction.reason
  });

  writeJson('moderationActions.json', nextActions);
  writeAuditLog(req, `DISCORD_MODERATION_${action.toUpperCase()}`, targetId, nextAction.reason);
  res.status(201).json({ ...nextAction, bot: botResult });
});

module.exports = router;
