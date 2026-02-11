import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/repos - List user's repositories
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const repos = db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM scans WHERE repo_id = r.id) as scan_count,
      (SELECT s.status FROM scans s WHERE s.repo_id = r.id ORDER BY s.created_at DESC LIMIT 1) as last_scan_status,
      (SELECT s.completed_at FROM scans s WHERE s.repo_id = r.id ORDER BY s.created_at DESC LIMIT 1) as last_scan_date
    FROM repositories r
    WHERE r.user_id = ? AND r.status = 'active'
    ORDER BY r.created_at DESC
  `).all(req.user.id);

  res.json({ repos });
});

// POST /api/repos - Add a repository
router.post('/', authenticate, (req, res) => {
  const { name, url, type = 'git', language } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  if (type === 'git' && !url) {
    return res.status(400).json({ error: 'Git URL is required for git repositories' });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO repositories (id, user_id, name, url, type, language, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, req.user.id, name, url || null, type, language || null);

  const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(id);
  res.status(201).json({ repo });
});

// POST /api/repos/upload - Upload a binary
router.post('/upload', authenticate, (req, res) => {
  const { name, fileName, fileSize } = req.body;

  if (!name || !fileName) {
    return res.status(400).json({ error: 'Name and fileName are required' });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO repositories (id, user_id, name, type, file_name, file_size, status)
    VALUES (?, ?, ?, 'binary', ?, ?, 'active')
  `).run(id, req.user.id, name, fileName, fileSize || 0);

  const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(id);
  res.status(201).json({ repo });
});

// GET /api/repos/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const repo = db.prepare('SELECT * FROM repositories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const scans = db.prepare(`
    SELECT id, status, scan_type, started_at, completed_at, duration_ms, 
           total_files_scanned, total_vulnerabilities, summary, created_at
    FROM scans WHERE repo_id = ? ORDER BY created_at DESC
  `).all(repo.id);

  res.json({ repo, scans });
});

// DELETE /api/repos/:id
router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const repo = db.prepare('SELECT * FROM repositories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  db.prepare("UPDATE repositories SET status = 'archived' WHERE id = ?").run(repo.id);
  res.json({ message: 'Repository deleted' });
});

export default router;
