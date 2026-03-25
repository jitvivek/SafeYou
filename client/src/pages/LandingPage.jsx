import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import {
  Shield, ShieldCheck, Zap, Code2, FileSearch, Brain,
  ArrowRight, Check, Star, Lock, Gauge, FileText,
  GitBranch, Upload, ScanSearch, BarChart3, ChevronRight,
  AlertTriangle, CheckCircle2, Cpu, Box, HardDrive,
  Server, Package, Layers, Binary, Container,
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [binaryReport, setBinaryReport] = useState(null);

  const handleQuickScan = async () => {
    if (!repoUrl.trim()) return;
    setScanning(true);
    setScanResult(null);
    setBinaryReport(null);
    try {
      const data = await api.publicScan({ url: repoUrl, name: repoUrl });
      setScanResult(data.report);
      setBinaryReport(data.binaryReport);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-primary" />
              AI-Powered Vulnerability Scanning
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Secure Your Code{' '}
              <span className="bg-gradient-to-r from-primary via-neon-blue to-neon-purple bg-clip-text text-transparent">
                Before It Ships
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              SafeYou scans your source code and binaries for known vulnerabilities,
              maps them to CVEs, and provides AI-powered remediation with patch guidance.
            </p>

            {/* Quick Scan Input */}
            <motion.div
              className="max-w-xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Enter GitHub repo URL or server address (e.g. github.com/user/repo)"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickScan()}
                  className="h-12 text-base"
                  aria-label="Repository URL or server address for quick scan"
                />
                <Button
                  variant="glow"
                  size="xl"
                  onClick={handleQuickScan}
                  disabled={scanning || !repoUrl.trim()}
                  className="shrink-0"
                >
                  {scanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanSearch className="h-5 w-5 mr-2" />
                      Scan Free
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Try a free scan — no signup required. Get a partial report instantly.
              </p>
            </motion.div>

            {/* Scan Result Preview */}
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="max-w-xl mx-auto text-left glow-green">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Scan Results (Partial)
                    </CardTitle>
                    <CardDescription>
                      Found {scanResult.summary.total} vulnerabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 flex-wrap">
                      {scanResult.summary.critical > 0 && (
                        <Badge variant="critical">Critical: {scanResult.summary.critical}</Badge>
                      )}
                      {scanResult.summary.high > 0 && (
                        <Badge variant="high">High: {scanResult.summary.high}</Badge>
                      )}
                      {scanResult.summary.medium > 0 && (
                        <Badge variant="medium">Medium: {scanResult.summary.medium}</Badge>
                      )}
                      {scanResult.summary.low > 0 && (
                        <Badge variant="low">Low: {scanResult.summary.low}</Badge>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top Issues:</p>
                      {scanResult.topIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-secondary/50">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                            issue.severity === 'critical' ? 'text-red-500' :
                            issue.severity === 'high' ? 'text-orange-500' :
                            issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">{issue.cve_id}</span>
                            <p className="text-foreground">{issue.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-primary/10 rounded-lg p-3 text-sm text-center">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Sign up to see the full report with AI remediation & patch guidance
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="glow" className="w-full" onClick={() => navigate('/register')}>
                      Get Full Report <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* Binary CVE Analysis Report */}
            {binaryReport && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mt-6"
              >
                <Card className="max-w-3xl mx-auto text-left border-primary/40 glow-green">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      Binary CVE Analysis Report
                    </CardTitle>
                    <CardDescription>
                      Scanned binaries, firmware, libraries & containers — found{' '}
                      <span className="text-foreground font-semibold">{binaryReport.summary.total}</span>{' '}
                      vulnerabilities across{' '}
                      <span className="text-foreground font-semibold">{binaryReport.components.length}</span>{' '}
                      detected components
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Severity badges */}
                    <div className="flex gap-3 flex-wrap">
                      {binaryReport.summary.critical > 0 && (
                        <Badge variant="critical">Critical: {binaryReport.summary.critical}</Badge>
                      )}
                      {binaryReport.summary.high > 0 && (
                        <Badge variant="high">High: {binaryReport.summary.high}</Badge>
                      )}
                      {binaryReport.summary.medium > 0 && (
                        <Badge variant="medium">Medium: {binaryReport.summary.medium}</Badge>
                      )}
                      {binaryReport.summary.low > 0 && (
                        <Badge variant="low">Low: {binaryReport.summary.low}</Badge>
                      )}
                    </div>

                    {/* Risk score bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Overall Risk Score</span>
                        <span className={`font-bold ${
                          binaryReport.summary.riskLevel === 'Critical' ? 'text-red-500' :
                          binaryReport.summary.riskLevel === 'High' ? 'text-orange-500' :
                          binaryReport.summary.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {binaryReport.summary.riskScore}/100 — {binaryReport.summary.riskLevel}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            binaryReport.summary.riskLevel === 'Critical' ? 'bg-red-500' :
                            binaryReport.summary.riskLevel === 'High' ? 'bg-orange-500' :
                            binaryReport.summary.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${binaryReport.summary.riskScore}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Detected Components */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-primary" />
                        Detected Components
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {binaryReport.components.map((comp, i) => {
                          const catIcons = { binary: '⚙️', firmware: '🔧', library: '📚', container: '📦' };
                          return (
                            <Badge key={i} variant="outline" className="text-xs px-2.5 py-1">
                              <span className="mr-1">{catIcons[comp.category] || '📦'}</span>
                              {comp.name}
                              <span className="ml-1.5 opacity-60 text-[10px] uppercase">{comp.category}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Category breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Binaries', value: binaryReport.summary.byCategory?.binary || 0, icon: '⚙️' },
                        { label: 'Firmware', value: binaryReport.summary.byCategory?.firmware || 0, icon: '🔧' },
                        { label: 'Libraries', value: binaryReport.summary.byCategory?.library || 0, icon: '📚' },
                        { label: 'Containers', value: binaryReport.summary.byCategory?.container || 0, icon: '📦' },
                      ].map((cat, i) => (
                        <div key={i} className="bg-secondary/60 rounded-lg p-3 text-center">
                          <span className="text-lg">{cat.icon}</span>
                          <p className="text-xl font-bold text-foreground">{cat.value}</p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{cat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Scan metrics */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
                      <span>🔍 <span className="text-foreground font-medium">{binaryReport.metrics.binariesScanned}</span> binaries scanned</span>
                      <span>📖 <span className="text-foreground font-medium">{binaryReport.metrics.librariesDetected}</span> libraries detected</span>
                      <span>🧩 <span className="text-foreground font-medium">{binaryReport.metrics.totalComponents}</span> total components</span>
                      <span>⏱ <span className="text-foreground font-medium">{(binaryReport.metrics.durationMs / 1000).toFixed(1)}s</span> scan time</span>
                    </div>

                    <Separator />

                    {/* Top Binary Issues */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Top Binary Vulnerabilities
                      </p>
                      {binaryReport.topIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-secondary/50 border border-border/50">
                          <div className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                            issue.severity === 'critical' ? 'bg-red-500' :
                            issue.severity === 'high' ? 'bg-orange-500' :
                            issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-primary">{issue.cve_id}</span>
                              <Badge variant={issue.severity} className="text-[10px] px-1.5 py-0">
                                {issue.severity.toUpperCase()} ({issue.cvss_score})
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {issue.component_category}
                              </Badge>
                            </div>
                            <p className="text-foreground mt-0.5">{issue.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Component: <span className="text-foreground">{issue.affected_component}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Upsell */}
                    <div className="bg-primary/10 rounded-lg p-4 text-sm text-center space-y-2">
                      <Lock className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">Sign up to unlock the full Binary CVE Analysis</span>
                      <p className="text-xs text-muted-foreground">
                        AI-powered remediation, patch guidance, firmware deep-dive, SBOM export & more
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button variant="glow" className="w-full" onClick={() => navigate('/register')}>
                      Unlock Full Binary Report <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              className="flex flex-wrap justify-center gap-8 mt-12"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[
                { value: '100+', label: 'CVEs Tracked' },
                { value: '<10s', label: 'Avg Scan Time' },
                { value: '8+', label: 'Languages' },
                { value: '99.9%', label: 'Uptime' },
              ].map((stat, i) => (
                <motion.div key={i} className="text-center" variants={fadeInUp}>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Ship Secure Code
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From scanning to remediation — SafeYou covers your entire security workflow.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: ScanSearch,
                title: 'Deep Code Scanning',
                description: 'Analyze source code and binaries for known vulnerabilities across 8+ programming languages.',
              },
              {
                icon: Shield,
                title: 'CVE Mapping',
                description: 'Automatically map detected issues to CVE identifiers with detailed CVSS scoring.',
              },
              {
                icon: Brain,
                title: 'AI Remediation',
                description: 'Get AI-generated code fixes, secure coding suggestions, and step-by-step patch guidance.',
              },
              {
                icon: Gauge,
                title: 'Lightning Fast',
                description: 'Scans complete in seconds, not hours. Get results before your coffee gets cold.',
              },
              {
                icon: FileText,
                title: 'Compliance Reports',
                description: 'Generate downloadable reports in PDF and JSON formats for audit and compliance needs.',
              },
              {
                icon: Code2,
                title: 'Developer First',
                description: 'Built for developers — actionable results, code-level fixes, and seamless workflow integration.',
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="h-full hover:glow-green transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three Steps to Secure Code
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                step: '01',
                icon: GitBranch,
                title: 'Connect Your Code',
                description: 'Add a Git repository URL or upload a binary file for scanning.',
              },
              {
                step: '02',
                icon: ScanSearch,
                title: 'Run a Scan',
                description: 'Our engine analyzes your code against 100+ known CVEs and vulnerability patterns.',
              },
              {
                step: '03',
                icon: CheckCircle2,
                title: 'Fix & Ship',
                description: 'Review findings, apply AI-suggested fixes, and ship with confidence.',
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="text-center relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-mono text-primary mb-2 block">STEP {item.step}</span>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-primary/30" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a free trial. Upgrade when you need full reports and AI remediation.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                name: 'Trial',
                price: 'Free',
                period: '',
                description: 'Try SafeYou with 3 free scans',
                features: ['3 total scans', 'Partial reports', 'Severity overview', 'Top 3 issues visible'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                description: 'For developers and small teams',
                features: ['50 scans/month', 'Full vulnerability reports', 'AI remediation', 'PDF & JSON export', 'CVSS scoring', 'Patch guidance'],
                cta: 'Get Pro',
                popular: true,
              },
              {
                name: 'Enterprise',
                price: '$99',
                period: '/month',
                description: 'For teams and organizations',
                features: ['Unlimited scans', 'Everything in Pro', 'Priority support', 'Custom integrations', 'Team management', 'Compliance reports'],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className={`relative h-full ${plan.popular ? 'border-primary glow-green' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="px-3">
                        <Star className="h-3 w-3 mr-1" /> Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-4 mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={plan.popular ? 'glow' : 'outline'}
                      className="w-full"
                      onClick={() => navigate('/register')}
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Secure Your Code?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start scanning today — no credit card required for your trial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="glow" size="xl" onClick={() => navigate('/register')}>
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/pricing')}>
                View Pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold">SafeYou</span>
              <span className="text-sm text-muted-foreground">© 2026</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
