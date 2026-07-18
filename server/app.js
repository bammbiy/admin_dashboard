require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const ipBlockRoutes = require('./routes/ipBlocks');
const intelligenceRoutes = require('./routes/intelligence');
const logger = require('./middleware/logger');
const ipFilter = require('./middleware/ipFilter');
const { startDiscordBot } = require('./bot/discordBot');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-for-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

app.use(logger);
app.use('/api', ipFilter);

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ip-blocks', ipBlockRoutes);
app.use('/api/intelligence', intelligenceRoutes);

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on port 3000');
  startDiscordBot();
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
