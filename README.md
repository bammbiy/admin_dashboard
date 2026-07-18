# Discord Server Intelligence Dashboard

Discord 서버의 메시지 위험 신호, 키워드 확산, 정책 위반 후보, 게임 활동을 한 화면에서 확인하는 관리자 대시보드입니다.

## Features

- Session login with `admin`, `manager`, and `viewer` roles
- Keyword Tracker and channel/message Signal Map
- Moderation Queue with warning and timeout records
- Discord.js collector for messages, members, and game presence
- Game Analytics with per-member average play time
- Access logs, audit logs, user management, and IP blocking
- Runs safely in sample mode when a Discord token is not configured

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000` or launch `Run Discord Dashboard.cmd`.

Default login:

- ID: `admin`
- Password: `admin123`

Change these credentials and `SESSION_SECRET` before using the app outside local development.

## Connect A Discord Server

1. Create a bot in the Discord Developer Portal and invite it to the server.
2. Enable `Server Members Intent`, `Message Content Intent`, and `Presence Intent`.
3. Copy `.env.example` to `.env` and set:

```env
PORT=3000
SESSION_SECRET=use-a-long-random-value
DISCORD_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-server-id
```

4. Start the app again. The top-right status changes from `Discord: 샘플 모드` to `Discord: 연결됨`.

The bot collects only server-scoped events needed by the dashboard. Do not commit `.env` or expose the bot token. Before production use, publish a collection notice and review the server's privacy and moderation policy.

## Data

Sample and collected data are stored under `server/data/` as JSON so the project remains easy to inspect. For a larger server, replace this store with SQLite or PostgreSQL and add retention rules.
