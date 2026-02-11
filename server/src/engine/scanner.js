import { v4 as uuidv4 } from 'uuid';
import { CVE_DATABASE, LANGUAGE_PATTERNS } from './cveDatabase.js';

/**
 * SafeYou Scan Engine
 * 
 * Simulates realistic vulnerability scanning by:
 * 1. Detecting technology stack from repo URL/name/binary filename
 * 2. Selecting relevant CVEs from the mock database
 * 3. Applying weighted random severity distribution
 * 4. Generating AI-based remediation suggestions
 * 5. Computing realistic scan metrics
 */

// Detect languages/tech stacks from input
export function detectLanguages(repoUrl, repoName, fileName) {
  const input = `${repoUrl || ''} ${repoName || ''} ${fileName || ''}`.toLowerCase();
  const detected = new Set();

  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        detected.add(lang);
        break;
      }
    }
  }

  // Default: if nothing detected, assume javascript + generic
  if (detected.size === 0) {
    detected.add('javascript');
    detected.add('generic');
  }

  // Always include generic vulnerabilities
  detected.add('generic');

  return Array.from(detected);
}

// Select and randomize CVEs for the scan
function selectVulnerabilities(languages, minCount = 5, maxCount = 25) {
  const allCves = [];

  for (const lang of languages) {
    const langCves = CVE_DATABASE[lang] || [];
    allCves.push(...langCves);
  }

  // Shuffle
  const shuffled = allCves.sort(() => Math.random() - 0.5);

  // Pick a realistic count
  const count = Math.min(
    shuffled.length,
    Math.max(minCount, Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount)
  );

  return shuffled.slice(0, count);
}

// Simulate scan progress with realistic timing
function simulateScanMetrics() {
  return {
    filesScanned: Math.floor(Math.random() * 500) + 50,
    durationMs: Math.floor(Math.random() * 8000) + 2000,
  };
}

// Calculate severity summary
function calculateSummary(vulnerabilities) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: vulnerabilities.length,
    riskScore: 0,
  };

  for (const vuln of vulnerabilities) {
    summary[vuln.severity]++;
    summary.riskScore += vuln.cvss_score;
  }

  // Normalize risk score to 0-100
  summary.riskScore = Math.min(100, Math.round(
    (summary.riskScore / (vulnerabilities.length * 10)) * 100
  ));

  // Risk level
  if (summary.critical > 0) summary.riskLevel = 'Critical';
  else if (summary.high > 2) summary.riskLevel = 'High';
  else if (summary.high > 0 || summary.medium > 3) summary.riskLevel = 'Medium';
  else summary.riskLevel = 'Low';

  return summary;
}

// Main scan function
export async function runScan(repo) {
  const languages = detectLanguages(repo.url, repo.name, repo.file_name);
  const rawVulns = selectVulnerabilities(languages);
  const metrics = simulateScanMetrics();

  // Build vulnerability objects
  const vulnerabilities = rawVulns.map(vuln => ({
    id: uuidv4(),
    cve_id: vuln.cve_id,
    title: vuln.title,
    description: vuln.description,
    severity: vuln.severity,
    cvss_score: vuln.cvss_score,
    affected_component: vuln.affected_component,
    affected_version: vuln.affected_version || 'Unknown',
    fixed_version: vuln.fixed_version || 'Latest',
    remediation: vuln.remediation,
    patch_guidance: vuln.patch_guidance,
    ai_fix: vuln.ai_fix || generateAIFix(vuln),
    references: vuln.references || [],
  }));

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary = calculateSummary(vulnerabilities);

  return {
    vulnerabilities,
    summary,
    metrics,
    languages,
  };
}

// Generate AI fix suggestion if none exists
function generateAIFix(vuln) {
  return `// AI-Generated Fix for ${vuln.cve_id}
// Component: ${vuln.affected_component}
// Severity: ${vuln.severity.toUpperCase()} (CVSS: ${vuln.cvss_score})
//
// Recommended actions:
// 1. ${vuln.remediation}
// 2. Review the affected component's changelog
// 3. Run regression tests after applying the fix
// 4. Consider implementing additional security controls

// ${vuln.patch_guidance}`;
}

// Generate partial report (for trial/unauthenticated users)
export function generatePartialReport(scanResult) {
  const { summary, vulnerabilities } = scanResult;
  return {
    summary: {
      total: summary.total,
      critical: summary.critical,
      high: summary.high,
      medium: summary.medium,
      low: summary.low,
      riskScore: summary.riskScore,
      riskLevel: summary.riskLevel,
    },
    topIssues: vulnerabilities.slice(0, 3).map(v => ({
      cve_id: v.cve_id,
      title: v.title,
      severity: v.severity,
      cvss_score: v.cvss_score,
      affected_component: v.affected_component,
    })),
    isPartial: true,
    message: 'Sign up for a paid plan to see the full report with all vulnerabilities, AI remediation, and patch guidance.',
  };
}

// Generate full report (for paid users)
export function generateFullReport(scanResult) {
  return {
    summary: scanResult.summary,
    vulnerabilities: scanResult.vulnerabilities,
    metrics: scanResult.metrics,
    languages: scanResult.languages,
    isPartial: false,
    generatedAt: new Date().toISOString(),
  };
}
