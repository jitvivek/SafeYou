import { getDb } from './init.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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

  // Seed admin/test user with Enterprise plan (full access)
  const adminEmail = 'jit.vivek@gmail.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync('vivekcyber', 12);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, plan, trial_scans_remaining, scans_this_month)
      VALUES (?, ?, ?, ?, 'enterprise', 999, 0)
    `).run(id, adminEmail, passwordHash, 'Vivek Jit');
    console.log('✅ Test user seeded: jit.vivek@gmail.com (Enterprise plan)');
  }

  console.log('✅ Database seeded with plans');
}
