// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- tiny JSON "database" helpers ---
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}
function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw || '{"users": []}');
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- middleware ---
app.use(express.json());
app.use(
  session({
    secret: 'super-secret-but-simple-demo',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// helper: remove sensitive fields
function cleanUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    bio: u.bio || '',
    avatar: u.avatar || '',
  };
}

// --- auth routes ---
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email, and password.' });
  }

  const db = readDB();
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    name,
    email,
    passwordHash,
    bio: '',
    avatar: '',
    createdAt: Date.now(),
  };
  db.users.push(user);
  writeDB(db);

  req.session.userId = user.id;
  res.json({ user: cleanUser(user) });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

  req.session.userId = user.id;
  res.json({ user: cleanUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --- profile routes ---
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

app.get('/api/me', requireAuth, (req, res) => {
  const db = readDB();
  const me = db.users.find((u) => u.id === req.session.userId);
  if (!me) return res.status(401).json({ error: 'Session invalid.' });
  res.json({ user: cleanUser(me) });
});

app.put('/api/me', requireAuth, (req, res) => {
  const { name, bio, avatar } = req.body || {};
  const db = readDB();
  const idx = db.users.findIndex((u) => u.id === req.session.userId);
  if (idx === -1) return res.status(401).json({ error: 'Session invalid.' });

  // update only allowed fields
  if (typeof name === 'string') db.users[idx].name = name;
  if (typeof bio === 'string') db.users[idx].bio = bio;
  if (typeof avatar === 'string') db.users[idx].avatar = avatar;

  writeDB(db);

  res.json({ user: cleanUser(db.users[idx]) });
});

// Fallback: serve index for unknown routes (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  ensureDB();
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
