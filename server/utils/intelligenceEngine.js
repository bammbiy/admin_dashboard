const POLICY_RULES = [
  {
    id: 'privacy',
    label: '개인정보 노출',
    severity: 'critical',
    score: 45,
    keywords: ['개인정보', '전화번호', '이메일', '010-', '@']
  },
  {
    id: 'fraud',
    label: '사기/피싱 의심',
    severity: 'critical',
    score: 45,
    keywords: ['사기', '결제 정보', '무료 쿠폰', '외부 링크', 'http://', 'https://']
  },
  {
    id: 'boosting',
    label: '대리/부정 플레이',
    severity: 'high',
    score: 38,
    keywords: ['대리', '선입금', '핵', '부정', '랭크']
  },
  {
    id: 'harassment',
    label: '분쟁/공격성',
    severity: 'medium',
    score: 25,
    keywords: ['신고', '규칙 위반', '타임아웃', '욕설']
  },
  {
    id: 'spam',
    label: '스팸/광고',
    severity: 'medium',
    score: 30,
    keywords: ['무료', '쿠폰', '링크', 'DM', '문의']
  }
];

const KEYWORD_DICTIONARY = [
  '롤',
  '발로란트',
  '내전',
  '사기',
  '무료',
  '쿠폰',
  '링크',
  '개인정보',
  '전화번호',
  '대리',
  '핵',
  '타임아웃',
  '규칙 위반'
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function findEvidence(text, keyword) {
  const source = String(text || '');
  const index = normalize(source).indexOf(normalize(keyword));

  if (index < 0) return '';

  const start = Math.max(0, index - 22);
  const end = Math.min(source.length, index + keyword.length + 32);
  return source.slice(start, end);
}

function analyzeText(text) {
  const matches = [];
  let score = 0;

  POLICY_RULES.forEach((rule) => {
    const keywords = rule.keywords.filter((keyword) => normalize(text).includes(normalize(keyword)));

    if (keywords.length > 0) {
      score += rule.score + Math.min(20, (keywords.length - 1) * 6);
      matches.push({
        policyId: rule.id,
        label: rule.label,
        severity: rule.severity,
        keywords,
        evidence: findEvidence(text, keywords[0])
      });
    }
  });

  return {
    score: Math.min(100, score),
    matches
  };
}

function severityFromScore(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function getMemberName(members, userId) {
  const member = members.find((item) => item.id === userId);
  return member?.displayName || userId.replace(/^usr_/, '');
}

function getChannelName(channels, channelId) {
  const channel = channels.find((item) => item.id === channelId);
  return channel ? `#${channel.name}` : channelId;
}

function extractKeywords(messages) {
  const counts = new Map();

  messages.forEach((message) => {
    KEYWORD_DICTIONARY.forEach((keyword) => {
      if (message.content.includes(keyword)) {
        counts.set(keyword, (counts.get(keyword) || 0) + 1);
      }
    });
  });

  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
}

function buildKeywordTracker(messages, channels, members, keyword) {
  const trendKeywords = extractKeywords(messages);
  const selectedKeyword = keyword || trendKeywords[0]?.keyword || '롤';
  const matches = messages
    .filter((message) => message.content.includes(selectedKeyword))
    .map((message) => {
      const analysis = analyzeText(message.content);
      return {
        id: message.id,
        channelId: message.channelId,
        channel: getChannelName(channels, message.channelId),
        authorId: message.authorId,
        author: getMemberName(members, message.authorId),
        createdAt: message.createdAt,
        content: message.content,
        reactions: message.reactions,
        replyCount: message.replyCount,
        score: analysis.score,
        severity: severityFromScore(analysis.score),
        policies: analysis.matches,
        context: findEvidence(message.content, selectedKeyword) || message.content
      };
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const channelCounts = channels
    .map((channel) => ({
      channelId: channel.id,
      channel: getChannelName(channels, channel.id),
      count: matches.filter((message) => message.channelId === channel.id).length
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    keyword: selectedKeyword,
    trendKeywords,
    channelCounts,
    matches
  };
}

function buildSignalMap(messages, channels, members, keyword) {
  const tracker = buildKeywordTracker(messages, channels, members, keyword);
  const nodes = [
    {
      id: 'keyword',
      type: 'keyword',
      label: tracker.keyword,
      score: 100,
      x: 50,
      y: 50
    }
  ];
  const edges = [];
  const channelPositions = [
    [22, 24],
    [78, 24],
    [22, 76],
    [78, 76],
    [50, 18]
  ];

  tracker.channelCounts.forEach((channel, index) => {
    const [x, y] = channelPositions[index % channelPositions.length];
    nodes.push({
      id: channel.channelId,
      type: 'channel',
      label: channel.channel,
      score: Math.min(100, channel.count * 30),
      x,
      y
    });
    edges.push({ from: 'keyword', to: channel.channelId, label: 'mentioned in' });
  });

  tracker.matches.forEach((message, index) => {
    const x = 18 + (index % 4) * 22;
    const y = 38 + Math.floor(index / 4) * 18;
    nodes.push({
      id: message.id,
      type: 'message',
      label: `${message.author}: ${message.content.slice(0, 24)}`,
      score: Math.max(20, message.score),
      x,
      y
    });
    edges.push({ from: message.channelId, to: message.id, label: 'message' });
  });

  return {
    ...tracker,
    nodes,
    edges,
    timeline: tracker.matches,
    relatedPosts: tracker.matches.map((message) => ({
      id: message.id,
      title: message.content,
      category: message.channel,
      tags: [message.author, `${message.reactions} reactions`, `${message.replyCount} replies`],
      views: message.reactions + message.replyCount,
      likes: message.reactions,
      relation: 'discord message'
    }))
  };
}

function buildModerationQueue(messages, channels, members, actions = []) {
  const actionMap = new Map(actions.map((action) => [action.targetId, action]));

  return messages
    .map((message) => {
      const analysis = analyzeText(message.content);
      const action = actionMap.get(message.id);

      return {
        id: `mod_${message.id}`,
        targetId: message.id,
        type: 'message',
        title: getChannelName(channels, message.channelId),
        authorId: message.authorId,
        author: getMemberName(members, message.authorId),
        channel: getChannelName(channels, message.channelId),
        createdAt: message.createdAt,
        content: message.content,
        score: analysis.score,
        severity: severityFromScore(analysis.score),
        policies: analysis.matches,
        status: action?.status || (analysis.score >= 35 ? 'pending' : 'clear'),
        action: action || null
      };
    })
    .filter((item) => item.score >= 25 || item.status !== 'clear')
    .sort((a, b) => b.score - a.score);
}

function buildGameAnalytics(sessions, messages, members) {
  const memberStats = members.map((member) => {
    const userSessions = sessions.filter((session) => session.userId === member.id);
    const totalMinutes = userSessions.reduce((sum, session) => sum + session.minutes, 0);
    const gameCounts = new Map();
    const partyCounts = new Map();

    userSessions.forEach((session) => {
      gameCounts.set(session.game, (gameCounts.get(session.game) || 0) + session.minutes);
      session.party.forEach((partyId) => {
        partyCounts.set(partyId, (partyCounts.get(partyId) || 0) + 1);
      });
    });

    const favoriteGame = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topParty = [...partyCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const messageCount = messages.filter((message) => message.authorId === member.id).length;

    return {
      userId: member.id,
      displayName: member.displayName,
      discordTag: member.discordTag,
      totalMinutes,
      averageMinutes: userSessions.length ? Math.round(totalMinutes / userSessions.length) : 0,
      sessions: userSessions.length,
      favoriteGame: favoriteGame?.[0] || '-',
      favoriteGameMinutes: favoriteGame?.[1] || 0,
      topPartyMember: topParty ? getMemberName(members, topParty[0]) : '-',
      messageCount
    };
  });

  const gameStats = [...sessions.reduce((map, session) => {
    const current = map.get(session.game) || { game: session.game, totalMinutes: 0, sessions: 0, players: new Set() };
    current.totalMinutes += session.minutes;
    current.sessions += 1;
    current.players.add(session.userId);
    map.set(session.game, current);
    return map;
  }, new Map()).values()]
    .map((item) => ({
      game: item.game,
      totalMinutes: item.totalMinutes,
      sessions: item.sessions,
      players: item.players.size,
      averageMinutes: Math.round(item.totalMinutes / item.sessions)
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const channelInterest = [
    { channel: '#league-of-legends', topic: 'League of Legends', messages: messages.filter((message) => message.channelId === 'ch_lol').length },
    { channel: '#valorant', topic: 'VALORANT', messages: messages.filter((message) => message.channelId === 'ch_valorant').length },
    { channel: '#trade', topic: 'Trading', messages: messages.filter((message) => message.channelId === 'ch_trade').length },
    { channel: '#general', topic: 'Daily chat', messages: messages.filter((message) => message.channelId === 'ch_general').length }
  ].sort((a, b) => b.messages - a.messages);

  return {
    totalSessions: sessions.length,
    totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
    averageSessionMinutes: sessions.length
      ? Math.round(sessions.reduce((sum, session) => sum + session.minutes, 0) / sessions.length)
      : 0,
    topGame: gameStats[0]?.game || '-',
    gameStats,
    memberStats: memberStats.sort((a, b) => b.totalMinutes - a.totalMinutes),
    channelInterest
  };
}

module.exports = {
  buildKeywordTracker,
  buildModerationQueue,
  buildSignalMap,
  buildGameAnalytics
};
