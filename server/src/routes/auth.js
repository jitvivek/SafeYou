import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'safeyou_dev_secret';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, plan, trial_scans_remaining)
      VALUES (?, ?, ?, ?, 'trial', 3)
    `).run(id, email.toLowerCase(), passwordHash, name);

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });

    const user = db.prepare('SELECT id, email, name, plan, trial_scans_remaining, scans_this_month, created_at FROM users WHERE id = ?').get(id);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trial_scans_remaining: user.trial_scans_remaining,
        scans_this_month: user.scans_this_month,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, plan, trial_scans_remaining, scans_this_month, created_at FROM users WHERE id = ?').get(req.user.id);
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);

  res.json({ user, plan });
});

// PUT /api/auth/plan
router.put('/plan', authenticate, (req, res) => {
  const { planId } = req.body;
  if (!['trial', 'pro', 'enterprise'].includes(planId)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const db = getDb();
  db.prepare('UPDATE users SET plan = ?, scans_this_month = 0 WHERE id = ?').run(planId, req.user.id);
  const user = db.prepare('SELECT id, email, name, plan, trial_scans_remaining, scans_this_month, created_at FROM users WHERE id = ?').get(req.user.id);

  res.json({ message: 'Plan updated', user });
});

export default router;
