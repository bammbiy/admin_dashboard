const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { readJson, writeJson } = require('../utils/dataStore');
const { writeAuditLog } = require('../utils/audit');
const { buildModerationQueue, buildSignalMap } = require('../utils/intelligenceEngine');

function getCommunityData() {
  return {
    posts: readJson('posts.json', []),
    comments: readJson('comments.json', []),
    users: readJson('users.json', []),
    actions: readJson('moderationActions.json', [])
  };
}

router.get('/signal-map', authMiddleware, (req, res) => {
  const { posts, comments, users } = getCommunityData();
  res.json(buildSignalMap(posts, comments, users, req.query.keyword));
});

router.get('/moderation-queue', authMiddleware, (req, res) => {
  const { posts, comments, users, actions } = getCommunityData();
  res.json(buildModerationQueue(posts, comments, users, actions));
});

router.post('/moderation-queue/:targetId/action', authMiddleware, requireRole('manager'), (req, res) => {
  const { targetId } = req.params;
  const { action, reason } = req.body;
  const allowedActions = ['warn', 'suspend', 'ignore'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ message: 'Unsupported moderation action.' });
  }

  const { posts, comments, users, actions } = getCommunityData();
  const target = [...posts, ...comments].find((item) => item.id === targetId);

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

  if (action === 'suspend') {
    const user = users.find((item) => item.id === target.authorId);

    if (user && user.username !== req.session.user.username) {
      user.status = 'suspended';
      writeJson('users.json', users);
    }
  }

  writeJson('moderationActions.json', nextActions);
  writeAuditLog(req, `MODERATION_${action.toUpperCase()}`, targetId, nextAction.reason);
  res.status(201).json(nextAction);
});

module.exports = router;
