import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';
import { runScan } from '../engine/scanner.js';

const router = Router();

// POST /api/scans - Start a new scan
router.post('/', authenticate, async (req, res) => {
  try {
    const { repoId, scanType = 'full' } = req.body;

    if (!repoId) {
      return res.status(400).json({ error: 'Repository ID is required' });
    }

    const db = getDb();

    // Check repo exists and belongs to user
    const repo = db.prepare('SELECT * FROM repositories WHERE id = ? AND user_id = ?').get(repoId, req.user.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check scan limits
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);

    if (user.plan === 'trial' && user.trial_scans_remaining <= 0) {
      return res.status(403).json({
        error: 'Trial scan limit reached',
        message: 'Upgrade to Pro or Enterprise to continue scanning.',
        upgradeRequired: true,
      });
    }

    if (plan.scan_limit > 0 && user.scans_this_month >= plan.scan_limit) {
      return res.status(403).json({
        error: 'Monthly scan limit reached',
        message: `Your ${plan.name} plan allows ${plan.scan_limit} scans per month.`,
        upgradeRequired: true,
      });
    }

    // Create scan record
    const scanId = uuidv4();
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO scans (id, repo_id, user_id, status, scan_type, started_at)
      VALUES (?, ?, ?, 'scanning', ?, ?)
    `).run(scanId, repoId, req.user.id, scanType, startedAt);

    // Run the scan engine
    const scanResult = await runScan(repo);
    const completedAt = new Date().toISOString();

    // Store vulnerabilities
    const insertVuln = db.prepare(`
      INSERT INTO vulnerabilities (id, scan_id, cve_id, title, description, severity, cvss_score, 
        affected_component, affected_version, fixed_version, remediation, patch_guidance, ai_fix, references_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of scanResult.vulnerabilities) {
      insertVuln.run(
        v.id, scanId, v.cve_id, v.title, v.description, v.severity,
        v.cvss_score, v.affected_component, v.affected_version,
        v.fixed_version, v.remediation, v.patch_guidance, v.ai_fix,
        JSON.stringify(v.references)
      );
    }

    // Update scan record
    db.prepare(`
      UPDATE scans SET 
        status = 'completed', 
        completed_at = ?, 
        duration_ms = ?,
        total_files_scanned = ?,
        total_vulnerabilities = ?,
        summary = ?
      WHERE id = ?
    `).run(
      completedAt,
      scanResult.metrics.durationMs,
      scanResult.metrics.filesScanned,
      scanResult.vulnerabilities.length,
      JSON.stringify(scanResult.summary),
      scanId
    );

    // Decrement scan counts
    if (user.plan === 'trial') {
      db.prepare('UPDATE users SET trial_scans_remaining = trial_scans_remaining - 1, scans_this_month = scans_this_month + 1 WHERE id = ?').run(req.user.id);
    } else {
      db.prepare('UPDATE users SET scans_this_month = scans_this_month + 1 WHERE id = ?').run(req.user.id);
    }

    const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(scanId);
    scan.summary = JSON.parse(scan.summary);

    res.status(201).json({ scan, scanResult: scanResult.summary });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// GET /api/scans - List user's scans
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const scans = db.prepare(`
    SELECT s.*, r.name as repo_name, r.url as repo_url, r.type as repo_type
    FROM scans s
    JOIN repositories r ON s.repo_id = r.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  scans.forEach(s => {
    try { s.summary = JSON.parse(s.summary); } catch { s.summary = {}; }
  });

  res.json({ scans });
});

// GET /api/scans/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const scan = db.prepare(`
    SELECT s.*, r.name as repo_name, r.url as repo_url, r.type as repo_type
    FROM scans s
    JOIN repositories r ON s.repo_id = r.id
    WHERE s.id = ? AND s.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  try { scan.summary = JSON.parse(scan.summary); } catch { scan.summary = {}; }

  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
  const planInfo = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);

  let vulnerabilities;
  if (planInfo.full_reports) {
    // Full access
    vulnerabilities = db.prepare('SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY cvss_score DESC').all(scan.id);
  } else {
    // Partial: top 3 only
    vulnerabilities = db.prepare('SELECT id, cve_id, title, severity, cvss_score, affected_component FROM vulnerabilities WHERE scan_id = ? ORDER BY cvss_score DESC LIMIT 3').all(scan.id);
  }

  vulnerabilities.forEach(v => {
    try { v.references = JSON.parse(v.references_json || '[]'); } catch { v.references = []; }
    delete v.references_json;
  });

  res.json({
    scan,
    vulnerabilities,
    isPartialReport: !planInfo.full_reports,
    totalVulnerabilities: scan.total_vulnerabilities,
  });
});

export default router;
