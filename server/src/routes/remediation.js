import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';
import { runRemediation } from '../engine/remediationEngine.js';

const router = Router();

// POST /api/remediation/:scanId - Run full remediation workflow for a scan
router.post('/:scanId', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const scan = db.prepare(`
      SELECT s.*, r.name as repo_name, r.id as r_id
      FROM scans s
      JOIN repositories r ON s.repo_id = r.id
      WHERE s.id = ? AND s.user_id = ?
    `).get(req.params.scanId, req.user.id);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Check plan access (Pro+ required)
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);
    if (!plan.ai_remediation) {
      return res.status(403).json({
        error: 'Remediation requires Pro or Enterprise plan',
        upgradeRequired: true,
      });
    }

    // Fetch vulnerabilities for this scan
    const vulnerabilities = db.prepare(
      'SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY cvss_score DESC'
    ).all(scan.id);

    vulnerabilities.forEach(v => {
      try { v.references = JSON.parse(v.references_json || '[]'); } catch { v.references = []; }
      delete v.references_json;
    });

    let summary;
    try { summary = JSON.parse(scan.summary); } catch { summary = {}; }

    // Run the remediation engine
    const result = runRemediation(vulnerabilities, summary);

    // ── Persist the post-fix re-scan as a new scan record ───────────────
    const newScanId = uuidv4();
    const now = new Date().toISOString();
    const rescanSummary = result.rescan.summary;

    db.prepare(`
      INSERT INTO scans (id, repo_id, user_id, status, scan_type, started_at, completed_at,
        duration_ms, total_files_scanned, total_vulnerabilities, summary)
      VALUES (?, ?, ?, 'completed', 'remediation', ?, ?, ?, ?, ?, ?)
    `).run(
      newScanId,
      scan.r_id,
      req.user.id,
      now,
      now,
      result.performance.riskScoreAfter > 0 ? 1200 : 800,
      scan.total_files_scanned || 0,
      rescanSummary.total,
      JSON.stringify(rescanSummary),
    );

    // Store remaining (mitigated) vulnerabilities in new scan
    const insertVuln = db.prepare(`
      INSERT INTO vulnerabilities (id, scan_id, cve_id, title, description, severity, cvss_score,
        affected_component, affected_version, fixed_version, remediation, patch_guidance, ai_fix, references_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of result.rescan.vulnerabilities) {
      insertVuln.run(
        uuidv4(), newScanId, v.cve_id, v.title, v.description || '', v.severity,
        v.cvss_score, v.affected_component, v.affected_version || '',
        v.fixed_version || '', v.remediation || '', v.patch_guidance || '',
        v.ai_fix || '', JSON.stringify(v.references || [])
      );
    }

    // Mark the original scan as remediated
    db.prepare(`UPDATE scans SET scan_type = 'remediated' WHERE id = ?`).run(scan.id);

    res.json({
      scanId: scan.id,
      newScanId,
      repoName: scan.repo_name,
      originalSummary: summary,
      ...result,
    });
  } catch (err) {
    console.error('Remediation error:', err);
    res.status(500).json({ error: 'Remediation failed' });
  }
});

export default router;
