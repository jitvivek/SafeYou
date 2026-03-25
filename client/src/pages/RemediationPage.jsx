import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, ShieldCheck, AlertTriangle, Shield, Brain, Wrench,
  Play, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  ArrowRight, TrendingUp, TrendingDown, BarChart3, Zap,
  FileText, Bug, Hammer, FlaskConical, RotateCcw, ArrowDown,
  Activity, Target, Minus, FileCode, FileMinus2, FilePlus2, FolderOpen,
} from 'lucide-react';

// ── Severity Helpers ────────────────────────────────────────────────────────

const sevColor = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
};

const sevBg = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

// ── Stepper ─────────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'pre-test', label: 'Pre-Fix Tests', icon: FlaskConical },
  { key: 'fixing', label: 'Apply Fixes', icon: Hammer },
  { key: 'post-test', label: 'Post-Fix Tests', icon: FlaskConical },
  { key: 'rescan', label: 'Re-Scan', icon: RotateCcw },
  { key: 'dashboard', label: 'Performance', icon: BarChart3 },
];

function Stepper({ currentIndex }) {
  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-8">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? 'bg-primary border-primary text-primary-foreground'
                  : active ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted text-muted-foreground'
              }`}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-[11px] mt-1.5 text-center whitespace-nowrap ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${done ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Test Results Panel ──────────────────────────────────────────────────────

function TestResultsPanel({ testData, title }) {
  const [expandedSuite, setExpandedSuite] = useState(null);
  if (!testData) return null;

  const { summary, suites } = testData;
  const passColor = summary.passRate >= 95 ? 'text-green-500'
    : summary.passRate >= 80 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" /> {title}
      </h3>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Passed</p>
          <p className="text-2xl font-bold text-green-500">{summary.passed}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-500">{summary.failed}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Pass Rate</p>
          <p className={`text-2xl font-bold ${passColor}`}>{summary.passRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="text-2xl font-bold">{(summary.durationMs / 1000).toFixed(1)}s</p>
        </CardContent></Card>
      </div>

      {/* Pass rate bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pass rate</span><span>{summary.passRate}%</span>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex">
          <motion.div
            className="h-full bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${summary.passRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className="h-full bg-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${100 - summary.passRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Suites */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {suites.map((suite) => {
          const isExpanded = expandedSuite === suite.name;
          const hasFails = suite.failed > 0;
          return (
            <Card key={suite.name} className={`${hasFails ? 'border-red-500/30' : 'border-green-500/20'}`}>
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedSuite(isExpanded ? null : suite.name)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {hasFails
                    ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  }
                  <span className="font-mono text-sm truncate">{suite.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-green-500">{suite.passed} ✓</span>
                  {suite.failed > 0 && <span className="text-xs text-red-500">{suite.failed} ✗</span>}
                  <span className="text-xs text-muted-foreground">{suite.durationMs}ms</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t overflow-hidden"
                  >
                    <div className="p-3 space-y-1">
                      {suite.tests.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm py-1">
                          {t.status === 'passed'
                            ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                            : <XCircle className="h-3.5 w-3.5 mt-0.5 text-red-500 shrink-0" />
                          }
                          <div className="min-w-0">
                            <span className={t.status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}>{t.name}</span>
                            {t.error && (
                              <p className="text-xs text-red-400/80 font-mono mt-0.5 break-all">{t.error}</p>
                            )}
                          </div>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">{t.durationMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Fixes Panel ─────────────────────────────────────────────────────────────

function FixesPanel({ fixes }) {
  if (!fixes) return null;
  const [expandedFix, setExpandedFix] = useState(null);

  const totalLines = fixes.reduce((s, f) => s + f.linesChanged, 0);
  const totalFiles = fixes.reduce((s, f) => s + f.filesModified, 0);
  const allFileChanges = fixes.flatMap(f => (f.fileChanges || []).map(fc => ({ ...fc, cve_id: f.cve_id })));

  const typeLabels = {
    dependency_upgrade: '📦 Dependency Upgrade',
    code_patch: '🔧 Code Patch',
    config_change: '⚙️ Config Change',
    library_replacement: '🔄 Library Replacement',
    security_hardening: '🛡️ Security Hardening',
  };

  const actionIcons = {
    rename: <FileMinus2 className="h-3.5 w-3.5 text-yellow-500" />,
    create: <FilePlus2 className="h-3.5 w-3.5 text-green-500" />,
    modify: <FileCode className="h-3.5 w-3.5 text-blue-500" />,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Hammer className="h-5 w-5 text-primary" /> Applied CVE Fixes
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Fixes Applied</p>
          <p className="text-2xl font-bold text-green-500">{fixes.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Lines Changed</p>
          <p className="text-2xl font-bold">{totalLines}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Files Modified</p>
          <p className="text-2xl font-bold">{totalFiles}</p>
        </CardContent></Card>
      </div>

      {/* File-change summary */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" /> File Changes
            <Badge variant="outline" className="text-[10px]">{allFileChanges.length} operations</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[200px] overflow-y-auto text-xs font-mono">
          {allFileChanges.map((fc, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              {actionIcons[fc.action] || actionIcons.modify}
              <div className="min-w-0 flex-1">
                {fc.action === 'rename' ? (
                  <span>
                    <span className="text-red-400 line-through">{fc.from}</span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="text-yellow-400">{fc.to}</span>
                  </span>
                ) : fc.action === 'create' ? (
                  <span className="text-green-400">+ {fc.path}</span>
                ) : (
                  <span className="text-blue-400">~ {fc.path}</span>
                )}
                <span className="text-muted-foreground ml-2">({fc.cve_id})</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Per-fix cards */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {fixes.map((fix, i) => {
          const isExpanded = expandedFix === fix.id;
          return (
            <motion.div
              key={fix.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="border-green-500/20">
                <div
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedFix(isExpanded ? null : fix.id)}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-primary">{fix.cve_id}</span>
                      <Badge variant={fix.severity} className="text-[10px] px-1.5 py-0">{fix.severity.toUpperCase()}</Badge>
                      <span className="text-[10px] text-muted-foreground">{typeLabels[fix.fixType] || fix.fixType}</span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{fix.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fix.fixDescription}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>+{fix.linesChanged} lines</span>
                      <span>{fix.filesModified} file{fix.filesModified > 1 ? 's' : ''}</span>
                      <span>{fix.fixDurationMs}ms</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && fix.fileChanges && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t overflow-hidden"
                    >
                      <div className="p-3 space-y-1.5 bg-secondary/20">
                        <p className="text-xs font-medium text-muted-foreground mb-1">File Operations:</p>
                        {fix.fileChanges.map((fc, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs font-mono">
                            {actionIcons[fc.action] || actionIcons.modify}
                            <div>
                              {fc.action === 'rename' ? (
                                <>
                                  <span className="text-red-400 line-through">{fc.from}</span>
                                  <span className="text-muted-foreground mx-1">→</span>
                                  <span className="text-yellow-400">{fc.to}</span>
                                </>
                              ) : fc.action === 'create' ? (
                                <span className="text-green-400">+ {fc.path}</span>
                              ) : (
                                <span className="text-blue-400">~ {fc.path}</span>
                              )}
                              <p className="text-muted-foreground text-[10px] mt-0.5">{fc.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Re-Scan Panel ───────────────────────────────────────────────────────────

function RescanPanel({ rescan, originalSummary }) {
  if (!rescan) return null;

  const { summary, vulnerabilities } = rescan;
  const fixedCount = originalSummary.total - summary.total;
  const fixRate = originalSummary.total > 0 ? Math.round((fixedCount / originalSummary.total) * 100) : 100;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-primary" /> Post-Fix Re-Scan Results
      </h3>

      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4 text-center">
          <p className="text-4xl font-bold text-green-500">{fixRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vulnerabilities Resolved ({fixedCount} of {originalSummary.total} fixed)
          </p>
        </CardContent>
      </Card>

      {/* Before / After comparison */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Before Remediation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} className="flex justify-between text-sm">
                <span className={`capitalize ${sevColor[sev]}`}>{sev}</span>
                <span className="font-bold">{originalSummary[sev] || 0}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span><span>{originalSummary.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk Score</span>
              <span className="text-red-500 font-bold">{originalSummary.riskScore}/100</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-500">After Remediation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} className="flex justify-between text-sm">
                <span className={`capitalize ${sevColor[sev]}`}>{sev}</span>
                <span className="font-bold">{summary[sev] || 0}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span><span>{summary.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk Score</span>
              <span className="text-green-500 font-bold">{summary.riskScore || 0}/100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remaining issues */}
      {vulnerabilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{vulnerabilities.length} mitigated issue{vulnerabilities.length > 1 ? 's' : ''} remaining:</p>
          {vulnerabilities.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-secondary/50">
              <div className={`w-2 h-2 rounded-full ${sevBg[v.severity]}`} />
              <span className="font-mono text-xs text-muted-foreground">{v.cve_id}</span>
              <span className="truncate">{v.title}</span>
              <Badge variant="outline" className="text-[10px] ml-auto shrink-0">mitigated</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Performance Dashboard ───────────────────────────────────────────────────

function PerformanceDashboard({ performance, originalSummary }) {
  if (!performance) return null;

  const p = performance;

  // Bar chart helper
  function BarCompare({ label, before, after, unit = '', inverse = false }) {
    const max = Math.max(before, after, 1);
    const improved = inverse ? after > before : after < before;
    const delta = after - before;
    const deltaSign = delta > 0 ? '+' : '';

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-semibold flex items-center gap-1 ${improved ? 'text-green-500' : delta === 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
            {improved ? <TrendingDown className="h-3.5 w-3.5" /> : delta === 0 ? <Minus className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {deltaSign}{delta}{unit}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-0.5">Before</div>
            <div className="h-5 bg-secondary rounded overflow-hidden">
              <motion.div
                className="h-full bg-red-500/70 rounded"
                initial={{ width: 0 }}
                animate={{ width: `${(before / max) * 100}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <div className="text-xs mt-0.5 font-mono">{before}{unit}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-0.5">After</div>
            <div className="h-5 bg-secondary rounded overflow-hidden">
              <motion.div
                className="h-full bg-green-500/70 rounded"
                initial={{ width: 0 }}
                animate={{ width: `${(after / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
            <div className="text-xs mt-0.5 font-mono">{after}{unit}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> Remediation Performance Dashboard
      </h3>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-3xl font-bold text-green-500">{p.fixRate}%</p>
            <p className="text-xs text-muted-foreground">Fix Rate</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-3xl font-bold text-green-500">-{p.riskReduction}</p>
            <p className="text-xs text-muted-foreground">Risk Reduction</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bug className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold">{p.vulnsFixed}</p>
            <p className="text-xs text-muted-foreground">Vulns Fixed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold">+{p.testPassRateImprovement}%</p>
            <p className="text-xs text-muted-foreground">Test Improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk score gauge */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk Score Improvement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{p.riskScoreBefore}</p>
              <p className="text-xs text-muted-foreground">{p.riskLevelBefore}</p>
            </div>
            <div className="flex-1 relative h-4 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                initial={{ width: `${p.riskScoreBefore}%` }}
                animate={{ width: `${p.riskScoreAfter}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{p.riskScoreAfter}</p>
              <p className="text-xs text-muted-foreground">{p.riskLevelAfter}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparisons */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vulnerability Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarCompare label="Critical" before={p.severityBefore.critical} after={p.severityAfter.critical} />
            <BarCompare label="High" before={p.severityBefore.high} after={p.severityAfter.high} />
            <BarCompare label="Medium" before={p.severityBefore.medium} after={p.severityAfter.medium} />
            <BarCompare label="Low" before={p.severityBefore.low} after={p.severityAfter.low} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Test Suite Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarCompare label="Pass Rate" before={p.testPassRateBefore} after={p.testPassRateAfter} unit="%" inverse />
            <BarCompare label="Failures" before={p.testFailuresBefore} after={p.testFailuresAfter} />
            <BarCompare label="Risk Score" before={p.riskScoreBefore} after={p.riskScoreAfter} />
            <BarCompare label="Total Vulns" before={p.severityBefore.critical + p.severityBefore.high + p.severityBefore.medium + p.severityBefore.low} after={p.severityAfter.critical + p.severityAfter.high + p.severityAfter.medium + p.severityAfter.low} />
          </CardContent>
        </Card>
      </div>

      {/* Severity stacked bars (visual) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Severity Distribution — Before vs After</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Before', 'After'].map(phase => {
            const data = phase === 'Before' ? p.severityBefore : p.severityAfter;
            const total = data.critical + data.high + data.medium + data.low || 1;
            return (
              <div key={phase}>
                <p className="text-xs text-muted-foreground mb-1">{phase}</p>
                <div className="h-6 flex rounded-full overflow-hidden bg-secondary">
                  {data.critical > 0 && (
                    <motion.div className="bg-red-500 h-full" initial={{ width: 0 }} animate={{ width: `${(data.critical / total) * 100}%` }} transition={{ duration: 0.6 }} />
                  )}
                  {data.high > 0 && (
                    <motion.div className="bg-orange-500 h-full" initial={{ width: 0 }} animate={{ width: `${(data.high / total) * 100}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
                  )}
                  {data.medium > 0 && (
                    <motion.div className="bg-yellow-500 h-full" initial={{ width: 0 }} animate={{ width: `${(data.medium / total) * 100}%` }} transition={{ duration: 0.6, delay: 0.2 }} />
                  )}
                  {data.low > 0 && (
                    <motion.div className="bg-blue-500 h-full" initial={{ width: 0 }} animate={{ width: `${(data.low / total) * 100}%` }} transition={{ duration: 0.6, delay: 0.3 }} />
                  )}
                  {total <= 1 && data.critical + data.high + data.medium + data.low === 0 && (
                    <motion.div className="bg-green-500 h-full w-full" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.6 }} />
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical: {data.critical}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High: {data.high}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium: {data.medium}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Low: {data.low}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═════════════════════════════════════════════════════════════════════════════

export default function RemediationPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(-1); // -1 = not started
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [newScanId, setNewScanId] = useState(null);

  async function startRemediation() {
    setLoading(true);
    setStep(0);
    setProgress(0);

    // Animate progress through steps
    const ticker = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 8 + 2;
      });
    }, 200);

    try {
      const result = await api.runRemediation(scanId);
      clearInterval(ticker);
      setProgress(100);
      setData(result);
      setRepoName(result.repoName || '');
      setNewScanId(result.newScanId || null);
      setStep(0); // Start at pre-test
      toast({ title: 'Remediation complete', description: `${result.fixes.length} fixes applied, re-scan done.` });
    } catch (err) {
      clearInterval(ticker);
      setProgress(0);
      setStep(-1);
      toast({ title: 'Remediation failed', description: err.data?.error || err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  // Render current step content
  function renderStepContent() {
    if (!data) return null;

    switch (STEPS[step]?.key) {
      case 'pre-test':
        return <TestResultsPanel testData={data.beforeTests} title="Unit Tests — Before Fixes" />;
      case 'fixing':
        return <FixesPanel fixes={data.fixes} />;
      case 'post-test':
        return <TestResultsPanel testData={data.afterTests} title="Unit Tests — After Fixes" />;
      case 'rescan':
        return <RescanPanel rescan={data.rescan} originalSummary={data.originalSummary} />;
      case 'dashboard':
        return <PerformanceDashboard performance={data.performance} originalSummary={data.originalSummary} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/scan/${scanId}`)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Scan Results
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" />
          CVE Remediation{repoName ? `: ${repoName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fix all vulnerabilities, run tests, re-scan, and review performance improvement.
        </p>
      </div>

      {/* Not started state */}
      {step === -1 && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-xl mx-auto text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Start CVE Remediation</CardTitle>
              <CardDescription>
                This will run unit tests, apply fixes for all detected CVEs,
                run tests again, re-scan the codebase, and show a performance dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1">
                      <Icon className="h-5 w-5 text-primary/60" />
                      <span className="text-xs">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="justify-center">
              <Button variant="glow" size="lg" onClick={startRemediation}>
                <Play className="h-5 w-5 mr-2" /> Run Full Remediation
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-lg font-medium">Running remediation pipeline…</p>
            <p className="text-sm text-muted-foreground">Tests → Fixes → Tests → Re-Scan</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </CardContent>
        </Card>
      )}

      {/* Stepper + Content */}
      {data && !loading && step >= 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Stepper currentIndex={step} />

          <Card>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={prevStep} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="glow" onClick={nextStep}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="glow" onClick={() => navigate(newScanId ? `/dashboard/scan/${newScanId}` : `/dashboard/scan/${scanId}`)}>
                <ShieldCheck className="h-4 w-4 mr-1" /> View Fixed Report <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
