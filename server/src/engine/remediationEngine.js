import { v4 as uuidv4 } from 'uuid';

/**
 * Remediation Engine
 *
 * Simulates a realistic CVE-fix workflow:
 *  1. Run unit tests BEFORE changes (baseline)
 *  2. Apply fixes for each vulnerability
 *  3. Run unit tests AFTER changes
 *  4. Re-scan to show improvement
 *  5. Compute performance delta
 */

// ── Unit Test Simulation ────────────────────────────────────────────────────

const TEST_SUITES = [
  'auth.test',
  'api.routes.test',
  'database.test',
  'input-validation.test',
  'crypto.test',
  'session.test',
  'file-upload.test',
  'rate-limiter.test',
  'cors.test',
  'error-handler.test',
  'middleware.test',
  'integration.test',
  'e2e.test',
  'security-headers.test',
  'xss-sanitize.test',
  'sql-injection.test',
  'binary-parser.test',
  'tls-config.test',
  'dependency-audit.test',
  'container-scan.test',
];

function generateTestResults(vulnerabilities, phase) {
  // phase = 'before' | 'after'
  const suites = [];
  const isBefore = phase === 'before';

  for (const suite of TEST_SUITES) {
    const testCount = Math.floor(Math.random() * 12) + 3;
    const tests = [];

    for (let i = 0; i < testCount; i++) {
      const testName = generateTestName(suite, i);
      let status;

      if (isBefore) {
        // Before fixes: some tests fail, especially security-related ones
        const failChance = suite.includes('security') || suite.includes('crypto') || suite.includes('tls')
          || suite.includes('xss') || suite.includes('sql') || suite.includes('binary')
          ? 0.45 : 0.12;
        status = Math.random() < failChance ? 'failed' : 'passed';
      } else {
        // After fixes: almost all pass
        status = Math.random() < 0.02 ? 'failed' : 'passed';
      }

      const durationMs = Math.floor(Math.random() * 400) + 10;
      tests.push({
        name: testName,
        status,
        durationMs,
        ...(status === 'failed' && isBefore ? { error: generateFailureMessage(suite) } : {}),
      });
    }

    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;

    suites.push({
      name: suite,
      tests,
      passed,
      failed,
      total: testCount,
      durationMs: tests.reduce((s, t) => s + t.durationMs, 0),
    });
  }

  const totalTests = suites.reduce((s, r) => s + r.total, 0);
  const totalPassed = suites.reduce((s, r) => s + r.passed, 0);
  const totalFailed = suites.reduce((s, r) => s + r.failed, 0);
  const totalDuration = suites.reduce((s, r) => s + r.durationMs, 0);

  return {
    phase,
    suites,
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: 0,
      passRate: Math.round((totalPassed / totalTests) * 10000) / 100,
      durationMs: totalDuration,
    },
  };
}

function generateTestName(suite, index) {
  const names = {
    'auth.test': ['should register a new user', 'should reject duplicate email', 'should login with valid creds', 'should reject invalid password', 'should return JWT token', 'should validate token expiry', 'should handle password reset', 'should hash passwords with bcrypt'],
    'crypto.test': ['should use secure random bytes', 'should validate TLS certificate chain', 'should reject weak ciphers', 'should enforce minimum key length', 'should pass FIPS compliance check', 'should handle certificate rotation'],
    'tls-config.test': ['should use TLS 1.3', 'should reject TLS 1.0', 'should verify certificate hostname', 'should check OCSP stapling', 'should enforce HSTS header', 'should pin certificate'],
    'xss-sanitize.test': ['should sanitize HTML input', 'should escape script tags', 'should handle encoded XSS', 'should strip event handlers', 'should sanitize SVG content', 'should escape template literals'],
    'sql-injection.test': ['should use parameterized queries', 'should reject UNION injection', 'should handle stacked queries', 'should escape special characters', 'should validate column names', 'should limit query depth'],
    'binary-parser.test': ['should validate ELF header', 'should check library versions', 'should detect vulnerable .so files', 'should scan container layers', 'should parse firmware metadata', 'should verify binary signatures'],
    'security-headers.test': ['should set X-Content-Type-Options', 'should set X-Frame-Options', 'should set CSP header', 'should set Referrer-Policy', 'should disable X-Powered-By'],
    'container-scan.test': ['should scan base image', 'should check for root user', 'should validate HEALTHCHECK', 'should detect exposed ports', 'should verify multi-stage build'],
    'dependency-audit.test': ['should have no critical deps', 'should check transitive deps', 'should verify lockfile integrity', 'should detect outdated packages', 'should check license compliance'],
  };

  const pool = names[suite] || [
    'should return 200 status', 'should handle errors gracefully', 'should validate input',
    'should enforce rate limits', 'should log audit events', 'should timeout long requests',
    'should handle concurrent requests', 'should return proper content type',
  ];

  return pool[index % pool.length];
}

function generateFailureMessage(suite) {
  const messages = {
    'crypto.test': 'AssertionError: Expected cipher suite TLS_AES_256_GCM_SHA384 but found TLS_RSA_WITH_AES_128_CBC_SHA',
    'tls-config.test': 'Error: Certificate chain verification failed — vulnerable OpenSSL version detected',
    'xss-sanitize.test': 'AssertionError: Unsanitized HTML passed through: <script>alert(1)</script>',
    'sql-injection.test': 'AssertionError: Raw SQL detected in query builder — parameterization missing',
    'binary-parser.test': 'Error: Vulnerable library libpng 1.6.37 detected in binary — expected >= 1.6.43',
    'security-headers.test': 'AssertionError: Missing Content-Security-Policy header',
    'container-scan.test': 'Error: Container running as root user — expected non-root',
    'dependency-audit.test': 'AssertionError: Found 3 critical vulnerabilities in dependencies',
  };
  return messages[suite] || 'AssertionError: Expected value to match security policy';
}

// ── Fix Application Simulation ──────────────────────────────────────────────

export function simulateFixesForVulnerabilities(vulnerabilities) {
  const fixes = [];
  for (const vuln of vulnerabilities) {
    const fixType = pickFixType(vuln);
    const fileChanges = generateFileChanges(vuln, fixType);
    fixes.push({
      id: uuidv4(),
      cve_id: vuln.cve_id,
      title: vuln.title,
      severity: vuln.severity,
      affected_component: vuln.affected_component,
      status: 'fixed',
      fixType,
      fixDescription: generateFixDescription(vuln),
      linesChanged: Math.floor(Math.random() * 40) + 2,
      filesModified: fileChanges.length,
      fixDurationMs: Math.floor(Math.random() * 3000) + 500,
      fileChanges,
    });
  }
  return fixes;
}

// Map components to realistic file paths
const COMPONENT_FILE_MAP = {
  'cross-spawn':   { dir: 'node_modules/cross-spawn',   ext: 'js' },
  'body-parser':   { dir: 'node_modules/body-parser',   ext: 'js' },
  'micromatch':    { dir: 'node_modules/micromatch',     ext: 'js' },
  'express':       { dir: 'node_modules/express/lib',    ext: 'js' },
  'axios':         { dir: 'node_modules/axios/lib',      ext: 'js' },
  'cookie':        { dir: 'node_modules/cookie',         ext: 'js' },
  'ws':            { dir: 'node_modules/ws/lib',         ext: 'js' },
  'send':          { dir: 'node_modules/send',           ext: 'js' },
  'ejs':           { dir: 'node_modules/ejs/lib',        ext: 'js' },
  'jose':          { dir: 'node_modules/jose/dist',      ext: 'js' },
  'OpenSSL':       { dir: 'lib/openssl',                 ext: 'c'  },
  'libpng':        { dir: 'lib/libpng',                  ext: 'c'  },
  'zlib':          { dir: 'lib/zlib',                    ext: 'c'  },
  'zlib (MiniZip)':{ dir: 'lib/zlib/contrib/minizip',   ext: 'c'  },
  'libjpeg-turbo': { dir: 'lib/libjpeg-turbo',          ext: 'c'  },
  'libxml2':       { dir: 'lib/libxml2/parser',          ext: 'c'  },
  'SQLite':        { dir: 'lib/sqlite',                  ext: 'c'  },
  'libcurl':       { dir: 'lib/curl',                    ext: 'c'  },
  'glibc':         { dir: 'lib/glibc',                   ext: 'c'  },
  'BusyBox':       { dir: 'firmware/busybox/shell',      ext: 'c'  },
  'U-Boot':        { dir: 'firmware/u-boot/fs',          ext: 'c'  },
  'FreeRTOS-Plus-TCP': { dir: 'firmware/freertos/tcp', ext: 'c' },
  'nginx':         { dir: 'conf/nginx',                  ext: 'conf' },
  'Redis':         { dir: 'conf/redis',                  ext: 'conf' },
  'OpenSSH':       { dir: 'conf/ssh',                    ext: 'conf' },
  'FFmpeg':        { dir: 'lib/ffmpeg/libavcodec',       ext: 'c'  },
  'GRUB2':         { dir: 'firmware/grub',               ext: 'c'  },
  'libwebp':       { dir: 'lib/libwebp/dec',             ext: 'c'  },
  'protobuf':      { dir: 'lib/protobuf',                ext: 'java' },
  'Alpine apk-tools':   { dir: 'docker',                 ext: 'Dockerfile' },
  'musl libc (Alpine)': { dir: 'docker',                 ext: 'Dockerfile' },
  'Debian wget':   { dir: 'docker',                      ext: 'Dockerfile' },
  'docker-engine': { dir: 'docker',                      ext: 'yml'  },
  'buildkit':      { dir: 'docker',                      ext: 'Dockerfile' },
  'kubernetes':    { dir: 'k8s',                         ext: 'yml'  },
  'spring-framework': { dir: 'src/main/java/config',    ext: 'java' },
  'spring-web':    { dir: 'src/main/java/config',        ext: 'java' },
  'apache-tomcat': { dir: 'conf/tomcat',                 ext: 'xml' },
  'logback-core':  { dir: 'src/main/resources',          ext: 'xml' },
  'commons-compress': { dir: 'src/main/java/util',      ext: 'java' },
  'xerces2-j':     { dir: 'src/main/java/xml',           ext: 'java' },
  'sqlalchemy':    { dir: 'src/db',                      ext: 'py'  },
  'starlette':     { dir: 'src/api',                     ext: 'py'  },
  'waitress':      { dir: 'conf',                        ext: 'ini' },
  'setuptools':    { dir: 'build',                       ext: 'cfg' },
  'requests':      { dir: 'src/http',                    ext: 'py'  },
  'idna':          { dir: 'src/validators',              ext: 'py'  },
  'jinja2':        { dir: 'src/templates',               ext: 'py'  },
  'django':        { dir: 'src/core',                    ext: 'py'  },
  'python-multipart': { dir: 'src/api',                  ext: 'py'  },
  'apache-avro':   { dir: 'src/schema',                  ext: 'py'  },
  'rustls':        { dir: 'src/tls',                     ext: 'rs'  },
  'wasmtime':      { dir: 'src/wasm',                    ext: 'rs'  },
  'php':           { dir: 'src/ext',                     ext: 'php' },
  'php-mysqlnd':   { dir: 'src/ext/mysqlnd',             ext: 'php' },
  'php-fpm':       { dir: 'conf/fpm',                    ext: 'conf' },
  'rack':          { dir: 'lib/rack',                    ext: 'rb'  },
  'rails':         { dir: 'app/controllers',             ext: 'rb'  },
  'actiontext':    { dir: 'app/views',                   ext: 'rb'  },
  'dotnet-runtime':{ dir: 'src/Security',                ext: 'cs'  },
  'golang/net':    { dir: 'pkg/net',                     ext: 'go'  },
  'golang/archive':{ dir: 'pkg/archive',                 ext: 'go'  },
  'golang/net/http':{ dir: 'pkg/http',                   ext: 'go'  },
  'golang/encoding':{ dir: 'pkg/encoding',               ext: 'go'  },
  'golang/go/parser':{ dir: 'pkg/parser',                ext: 'go'  },
  'libexpat':      { dir: 'lib/expat',                   ext: 'c'  },
  'cups':          { dir: 'conf/cups',                   ext: 'conf' },
  'curl':          { dir: 'lib/curl',                    ext: 'c'  },
};

function generateFileChanges(vuln, fixType) {
  const comp = vuln.affected_component || 'unknown';
  const mapping = COMPONENT_FILE_MAP[comp] || { dir: 'src', ext: 'js' };
  const baseName = comp.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Determine realistic source file name
  let srcFile;
  if (fixType === 'dependency_upgrade') {
    srcFile = mapping.ext === 'Dockerfile' ? 'Dockerfile' :
              mapping.ext === 'yml' ? `${baseName}.yml` :
              `package.${mapping.ext === 'java' ? 'xml' : mapping.ext === 'py' ? 'txt' : 'json'}`;
  } else if (fixType === 'config_change') {
    srcFile = mapping.ext === 'conf' ? `${baseName}.conf` :
              mapping.ext === 'xml' ? `${baseName}.xml` :
              `${baseName}_config.${mapping.ext}`;
  } else {
    srcFile = `${baseName}.${mapping.ext}`;
  }

  const dirPath = mapping.dir;
  const fullPath = `${dirPath}/${srcFile}`;
  const dirtyPath = `${dirPath}/_dirty_${srcFile}`;

  const changes = [
    {
      action: 'rename',
      from: fullPath,
      to: dirtyPath,
      description: `Renamed original file to _dirty prefix (backup)`,
    },
    {
      action: 'create',
      path: fullPath,
      description: `Created patched file with ${vuln.cve_id} fix applied`,
    },
  ];

  // For dependency upgrades, also show lockfile changes
  if (fixType === 'dependency_upgrade') {
    const lockfile = mapping.ext === 'java' ? 'pom.xml' :
                     mapping.ext === 'py' ? 'requirements.txt' :
                     mapping.ext === 'rb' ? 'Gemfile.lock' :
                     mapping.ext === 'rs' ? 'Cargo.lock' :
                     mapping.ext === 'go' ? 'go.sum' :
                     'package-lock.json';
    changes.push({
      action: 'modify',
      path: lockfile,
      description: `Updated ${lockfile} with patched ${comp} version`,
    });
  }

  return changes;
}

function pickFixType(vuln) {
  const types = ['dependency_upgrade', 'code_patch', 'config_change', 'library_replacement', 'security_hardening'];
  if (vuln.fixed_version && vuln.affected_version) return 'dependency_upgrade';
  if (vuln.severity === 'critical') return Math.random() > 0.5 ? 'code_patch' : 'security_hardening';
  return types[Math.floor(Math.random() * types.length)];
}

function generateFixDescription(vuln) {
  const sev = vuln.severity;
  if (vuln.fixed_version) {
    return `Upgraded ${vuln.affected_component} from ${vuln.affected_version} to ${vuln.fixed_version}`;
  }
  if (sev === 'critical' || sev === 'high') {
    return `Applied security patch for ${vuln.cve_id} in ${vuln.affected_component}`;
  }
  return `Hardened configuration for ${vuln.affected_component} to mitigate ${vuln.cve_id}`;
}

// ── Re-scan Simulation ──────────────────────────────────────────────────────

function simulateRescan(originalVulnerabilities) {
  // Most vulnerabilities are resolved; a small percentage remain (realistic)
  const remaining = [];
  for (const vuln of originalVulnerabilities) {
    const resolveChance = vuln.severity === 'critical' ? 0.95
      : vuln.severity === 'high' ? 0.92
      : vuln.severity === 'medium' ? 0.88
      : 0.85;

    if (Math.random() > resolveChance) {
      // Downgrade severity of remaining issues
      const downgradedSeverity = vuln.severity === 'critical' ? 'medium'
        : vuln.severity === 'high' ? 'low' : vuln.severity;
      remaining.push({
        ...vuln,
        severity: downgradedSeverity,
        cvss_score: Math.max(1.0, vuln.cvss_score - (Math.random() * 3 + 1)),
        status: 'mitigated',
      });
    }
  }

  const summary = { critical: 0, high: 0, medium: 0, low: 0, total: remaining.length, riskScore: 0 };
  for (const v of remaining) {
    summary[v.severity]++;
    summary.riskScore += v.cvss_score;
  }
  summary.riskScore = remaining.length > 0
    ? Math.min(100, Math.round((summary.riskScore / (remaining.length * 10)) * 100))
    : 0;

  if (summary.critical > 0) summary.riskLevel = 'Critical';
  else if (summary.high > 0) summary.riskLevel = 'High';
  else if (summary.medium > 0) summary.riskLevel = 'Medium';
  else if (summary.low > 0) summary.riskLevel = 'Low';
  else summary.riskLevel = 'Clean';

  return { vulnerabilities: remaining, summary };
}

// ── Performance Comparison ──────────────────────────────────────────────────

function computePerformanceDelta(beforeTests, afterTests, originalSummary, rescanSummary) {
  const vulnsFixed = originalSummary.total - rescanSummary.total;
  const fixRate = originalSummary.total > 0
    ? Math.round((vulnsFixed / originalSummary.total) * 10000) / 100
    : 100;

  const riskReduction = originalSummary.riskScore - rescanSummary.riskScore;

  return {
    vulnsFixed,
    vulnsRemaining: rescanSummary.total,
    fixRate,
    riskScoreBefore: originalSummary.riskScore,
    riskScoreAfter: rescanSummary.riskScore,
    riskReduction,
    riskLevelBefore: originalSummary.riskLevel,
    riskLevelAfter: rescanSummary.riskLevel,

    testPassRateBefore: beforeTests.summary.passRate,
    testPassRateAfter: afterTests.summary.passRate,
    testPassRateImprovement: Math.round((afterTests.summary.passRate - beforeTests.summary.passRate) * 100) / 100,

    testFailuresBefore: beforeTests.summary.failed,
    testFailuresAfter: afterTests.summary.failed,

    severityBefore: {
      critical: originalSummary.critical,
      high: originalSummary.high,
      medium: originalSummary.medium,
      low: originalSummary.low,
    },
    severityAfter: {
      critical: rescanSummary.critical,
      high: rescanSummary.high,
      medium: rescanSummary.medium,
      low: rescanSummary.low,
    },
  };
}

// ── Main Entry Point ────────────────────────────────────────────────────────

export function runRemediation(vulnerabilities, originalSummary) {
  // 1) Unit tests BEFORE
  const beforeTests = generateTestResults(vulnerabilities, 'before');

  // 2) Apply fixes
  const fixes = simulateFixesForVulnerabilities(vulnerabilities);

  // 3) Unit tests AFTER
  const afterTests = generateTestResults(vulnerabilities, 'after');

  // 4) Re-scan
  const rescan = simulateRescan(vulnerabilities);

  // 5) Performance delta
  const performance = computePerformanceDelta(beforeTests, afterTests, originalSummary, rescan.summary);

  return {
    beforeTests,
    fixes,
    afterTests,
    rescan,
    performance,
    generatedAt: new Date().toISOString(),
  };
}
