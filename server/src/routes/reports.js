import { Router } from 'express';
import { getDb } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/:scanId - Get formatted report
router.get('/:scanId', authenticate, (req, res) => {
  const db = getDb();
  const scan = db.prepare(`
    SELECT s.*, r.name as repo_name, r.url as repo_url, r.type as repo_type
    FROM scans s
    JOIN repositories r ON s.repo_id = r.id
    WHERE s.id = ? AND s.user_id = ?
  `).get(req.params.scanId, req.user.id);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  try { scan.summary = JSON.parse(scan.summary); } catch { scan.summary = {}; }

  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
  const planInfo = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);

  const vulnerabilities = db.prepare(
    'SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY cvss_score DESC'
  ).all(scan.id);

  vulnerabilities.forEach(v => {
    try { v.references = JSON.parse(v.references_json || '[]'); } catch { v.references = []; }
    delete v.references_json;
  });

  const isFullReport = !!planInfo.full_reports;

  const report = {
    id: scan.id,
    generatedAt: new Date().toISOString(),
    repository: {
      name: scan.repo_name,
      url: scan.repo_url,
      type: scan.repo_type,
    },
    scan: {
      id: scan.id,
      type: scan.scan_type,
      status: scan.status,
      startedAt: scan.started_at,
      completedAt: scan.completed_at,
      durationMs: scan.duration_ms,
      totalFilesScanned: scan.total_files_scanned,
    },
    summary: scan.summary,
    isPartialReport: !isFullReport,
  };

  if (isFullReport) {
    report.vulnerabilities = vulnerabilities;
    report.totalVulnerabilities = vulnerabilities.length;
  } else {
    report.vulnerabilities = vulnerabilities.slice(0, 3).map(v => ({
      cve_id: v.cve_id,
      title: v.title,
      severity: v.severity,
      cvss_score: v.cvss_score,
      affected_component: v.affected_component,
    }));
    report.totalVulnerabilities = vulnerabilities.length;
    report.upgradeMessage = 'Upgrade to Pro or Enterprise to see all vulnerabilities, AI remediation, and patch guidance.';
  }

  res.json({ report });
});

// GET /api/reports/:scanId/download?format=json|pdf
router.get('/:scanId/download', authenticate, (req, res) => {
  const { format = 'json' } = req.query;

  const db = getDb();
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
  const planInfo = db.prepare('SELECT * FROM plans WHERE id = ?').get(user.plan);

  if (!planInfo.pdf_export) {
    return res.status(403).json({
      error: 'Download not available on your plan',
      message: 'Upgrade to Pro or Enterprise to download reports.',
      upgradeRequired: true,
    });
  }

  const scan = db.prepare(`
    SELECT s.*, r.name as repo_name, r.url as repo_url
    FROM scans s
    JOIN repositories r ON s.repo_id = r.id
    WHERE s.id = ? AND s.user_id = ?
  `).get(req.params.scanId, req.user.id);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  try { scan.summary = JSON.parse(scan.summary); } catch { scan.summary = {}; }

  const vulnerabilities = db.prepare(
    'SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY cvss_score DESC'
  ).all(scan.id);

  vulnerabilities.forEach(v => {
    try { v.references = JSON.parse(v.references_json || '[]'); } catch { v.references = []; }
    delete v.references_json;
  });

  const report = {
    title: 'SafeYou Security Scan Report',
    generatedAt: new Date().toISOString(),
    repository: scan.repo_name,
    repositoryUrl: scan.repo_url,
    scanDate: scan.completed_at,
    summary: scan.summary,
    vulnerabilities: vulnerabilities,
  };

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="safeyou-report-${scan.id.slice(0, 8)}.json"`);
    res.json(report);
  } else {
    // For MVP, generate a text-based report (real PDF would use puppeteer/pdfkit)
    const lines = [
      '═══════════════════════════════════════════════════',
      '           SAFEYOU SECURITY SCAN REPORT',
      '═══════════════════════════════════════════════════',
      '',
      `Repository: ${scan.repo_name}`,
      `URL: ${scan.repo_url || 'N/A'}`,
      `Scan Date: ${scan.completed_at}`,
      `Risk Level: ${scan.summary.riskLevel || 'Unknown'}`,
      `Risk Score: ${scan.summary.riskScore || 0}/100`,
      '',
      '───────────────────────────────────────────────────',
      '                    SUMMARY',
      '───────────────────────────────────────────────────',
      `Total Vulnerabilities: ${scan.summary.total || 0}`,
      `  Critical: ${scan.summary.critical || 0}`,
      `  High: ${scan.summary.high || 0}`,
      `  Medium: ${scan.summary.medium || 0}`,
      `  Low: ${scan.summary.low || 0}`,
      '',
    ];

    for (const v of vulnerabilities) {
      lines.push('───────────────────────────────────────────────────');
      lines.push(`[${v.severity.toUpperCase()}] ${v.cve_id} - CVSS ${v.cvss_score}`);
      lines.push(`Title: ${v.title}`);
      lines.push(`Component: ${v.affected_component}`);
      lines.push(`Description: ${v.description}`);
      lines.push(`Remediation: ${v.remediation}`);
      lines.push(`Patch: ${v.patch_guidance}`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════');
    lines.push('  Report generated by SafeYou - safeyou.dev');
    lines.push('═══════════════════════════════════════════════════');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="safeyou-report-${scan.id.slice(0, 8)}.txt"`);
    res.send(lines.join('\n'));
  }
});

export default router;
