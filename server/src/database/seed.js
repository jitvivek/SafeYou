import { getDb } from './init.js';

export function seedDatabase() {
  const db = getDb();

  const existingPlans = db.prepare('SELECT COUNT(*) as count FROM plans').get();
  if (existingPlans && existingPlans.count > 0) return;

  const plans = [
    ['trial', 'Trial', 0, 3, 0, 0, 0, 0, JSON.stringify([
      '3 total scans',
      'Partial vulnerability reports',
      'Severity overview',
      'Top 3 issues visible'
    ])],
    ['pro', 'Pro', 29, 50, 1, 1, 1, 0, JSON.stringify([
      '50 scans per month',
      'Full vulnerability reports',
      'AI-powered remediation',
      'PDF & JSON export',
      'CVSS scoring & details',
      'Patch guidance'
    ])],
    ['enterprise', 'Enterprise', 99, -1, 1, 1, 1, 1, JSON.stringify([
      'Unlimited scans',
      'Full vulnerability reports',
      'AI-powered remediation',
      'PDF & JSON export',
      'Priority support',
      'Custom integrations',
      'Team management',
      'Compliance reports'
    ])]
  ];

  for (const plan of plans) {
    db.prepare(`
      INSERT INTO plans (id, name, price, scan_limit, full_reports, ai_remediation, pdf_export, priority_support, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...plan);
  }

  console.log('✅ Database seeded with plans');
}
