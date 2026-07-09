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
    severity: 'high',
    score: 40,
    keywords: ['사기', '결제 정보', '무료 쿠폰', '외부 링크', 'http://', 'https://']
  },
  {
    id: 'harassment',
    label: '분쟁/공격성',
    severity: 'medium',
    score: 25,
    keywords: ['신고', '엉망', '무시', '위험']
  },
  {
    id: 'spam',
    label: '스팸/광고',
    severity: 'medium',
    score: 30,
    keywords: ['무료', '쿠폰', '링크', '이벤트']
  },
  {
    id: 'support-risk',
    label: '고객 불만 확산',
    severity: 'low',
    score: 18,
    keywords: ['환불', '답변', '문의', '정책']
  }
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function findEvidence(text, keyword) {
  const source = String(text || '');
  const index = normalize(source).indexOf(normalize(keyword));

  if (index < 0) {
    return '';
  }

  const start = Math.max(0, index - 22);
  const end = Math.min(source.length, index + keyword.length + 28);
  return source.slice(start, end);
}

function analyzeText(text) {
  const matches = [];
  let score = 0;

  POLICY_RULES.forEach((rule) => {
    const keywords = rule.keywords.filter((keyword) => normalize(text).includes(normalize(keyword)));

    if (keywords.length > 0) {
      score += rule.score + Math.min(15, (keywords.length - 1) * 5);
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

function getAuthorName(users, authorId) {
  const user = users.find((item) => item.id === authorId);
  return user?.username || authorId.replace(/^usr_/, '');
}

function buildModerationQueue(posts, comments, users, actions = []) {
  const actionMap = new Map(actions.map((action) => [action.targetId, action]));
  const contentItems = [
    ...posts.map((post) => ({ type: 'post', item: post, post })),
    ...comments.map((comment) => ({
      type: 'comment',
      item: comment,
      post: posts.find((post) => post.id === comment.postId)
    }))
  ];

  return contentItems
    .map(({ type, item, post }) => {
      const title = type === 'post' ? item.title : post?.title || 'Unknown post';
      const text = type === 'post' ? `${item.title} ${item.content}` : item.content;
      const analysis = analyzeText(text);
      const action = actionMap.get(item.id);

      return {
        id: `mod_${item.id}`,
        targetId: item.id,
        type,
        title,
        authorId: item.authorId,
        author: getAuthorName(users, item.authorId),
        postId: post?.id || item.id,
        createdAt: item.createdAt,
        content: item.content,
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

function extractKeywords(posts, comments) {
  const dictionary = ['환불', '정책', '사기', '개인정보', '전화번호', '무료', '쿠폰', '링크', '추천', '업데이트', '신고'];
  const counts = new Map();

  [...posts, ...comments].forEach((item) => {
    const text = `${item.title || ''} ${item.content || ''}`;
    dictionary.forEach((keyword) => {
      if (text.includes(keyword)) {
        counts.set(keyword, (counts.get(keyword) || 0) + 1);
      }
    });
  });

  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);
}

function buildSignalMap(posts, comments, users, keyword) {
  const trendKeywords = extractKeywords(posts, comments);
  const selectedKeyword = keyword || trendKeywords[0]?.keyword || '환불';
  const nodes = [
    {
      id: 'keyword',
      type: 'keyword',
      label: selectedKeyword,
      score: 100,
      x: 50,
      y: 50
    }
  ];
  const edges = [];
  const timeline = [];
  const relatedPosts = [];

  const matchingPosts = posts.filter((post) => `${post.title} ${post.content} ${post.tags.join(' ')}`.includes(selectedKeyword));
  const matchingComments = comments.filter((comment) => comment.content.includes(selectedKeyword));

  matchingPosts.forEach((post, index) => {
    const analysis = analyzeText(`${post.title} ${post.content}`);
    nodes.push({
      id: post.id,
      type: 'post',
      label: post.title,
      score: Math.max(20, analysis.score),
      x: 24 + (index % 3) * 28,
      y: 24 + Math.floor(index / 3) * 22
    });
    edges.push({ from: 'keyword', to: post.id, label: 'appears in' });
    timeline.push({
      id: post.id,
      type: 'post',
      title: post.title,
      author: getAuthorName(users, post.authorId),
      createdAt: post.createdAt,
      score: analysis.score,
      excerpt: post.content
    });
    relatedPosts.push({
      id: post.id,
      title: post.title,
      category: post.category,
      tags: post.tags,
      views: post.views,
      likes: post.likes,
      relation: 'keyword match'
    });
  });

  matchingComments.forEach((comment, index) => {
    const post = posts.find((item) => item.id === comment.postId);
    const analysis = analyzeText(comment.content);
    const nodeId = comment.id;
    const parentId = nodes.some((node) => node.id === comment.postId) ? comment.postId : 'keyword';

    nodes.push({
      id: nodeId,
      type: 'comment',
      label: `${getAuthorName(users, comment.authorId)} 댓글`,
      score: Math.max(20, analysis.score),
      x: 18 + (index % 4) * 22,
      y: 62 + Math.floor(index / 4) * 20
    });
    edges.push({ from: parentId, to: nodeId, label: 'discussed by' });
    timeline.push({
      id: comment.id,
      type: 'comment',
      title: post?.title || 'Unknown post',
      author: getAuthorName(users, comment.authorId),
      createdAt: comment.createdAt,
      score: analysis.score,
      excerpt: comment.content
    });
  });

  posts
    .filter((post) => !relatedPosts.some((related) => related.id === post.id))
    .filter((post) => post.tags.some((tag) => matchingPosts.some((matched) => matched.tags.includes(tag))))
    .slice(0, 4)
    .forEach((post) => {
      relatedPosts.push({
        id: post.id,
        title: post.title,
        category: post.category,
        tags: post.tags,
        views: post.views,
        likes: post.likes,
        relation: 'shared tags'
      });
    });

  return {
    keyword: selectedKeyword,
    trendKeywords,
    nodes,
    edges,
    timeline: timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    relatedPosts
  };
}

module.exports = {
  buildModerationQueue,
  buildSignalMap
};
