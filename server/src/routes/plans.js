import { Router } from 'express';
import { getDb } from '../database/init.js';

const router = Router();

// GET /api/plans
router.get('/', (req, res) => {
  const db = getDb();
  const plans = db.prepare('SELECT * FROM plans ORDER BY price ASC').all();

  plans.forEach(p => {
    try { p.features = JSON.parse(p.features); } catch { p.features = []; }
    p.full_reports = !!p.full_reports;
    p.ai_remediation = !!p.ai_remediation;
    p.pdf_export = !!p.pdf_export;
    p.priority_support = !!p.priority_support;
  });

  res.json({ plans });
});

export default router;
