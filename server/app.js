const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const logger = require('./middleware/logger');
const ipFilter = require('./middleware/ipFilter');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'simple-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(logger);
app.use('/api', ipFilter);

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
