import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, ShieldCheck, AlertTriangle, Shield, Brain,
  FileText, Download, Lock, Crown, Code2, Wrench,
  ExternalLink, ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react';

export default function ScanResultPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [scan, setScan] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [isPartial, setIsPartial] = useState(false);
  const [totalVulns, setTotalVulns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedVuln, setExpandedVuln] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadScan();
  }, [scanId]);

  async function loadScan() {
    setLoading(true);
    try {
      const data = await api.getScan(scanId);
      setScan(data.scan);
      setVulnerabilities(data.vulnerabilities || []);
      setIsPartial(data.isPartialReport);
      setTotalVulns(data.totalVulnerabilities);
    } catch (err) {
      toast({ title: 'Error loading scan', description: err.message, variant: 'destructive' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(format) {
    try {
      const response = await api.downloadReport(scanId, format);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safeyou-report-${scanId.slice(0, 8)}.${format === 'json' ? 'json' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Report downloaded' });
    } catch (err) {
      if (err.data?.upgradeRequired) {
        toast({ title: 'Upgrade required', description: 'Download is available on Pro and Enterprise plans.', variant: 'destructive' });
      } else {
        toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
      }
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const severityColors = {
    critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
    low: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  const summary = scan.summary || {};
  const riskPercentage = summary.riskScore || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Scan Results: {scan.repo_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completed {new Date(scan.completed_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })} • {scan.total_files_scanned} files scanned • {scan.duration_ms}ms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('json')}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('txt')}>
            <FileText className="h-4 w-4 mr-1" /> Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
            <div className="relative mx-auto w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-secondary"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="2"
                  strokeDasharray={`${riskPercentage}, 100`}
                  className={
                    riskPercentage > 70 ? 'stroke-red-500' :
                    riskPercentage > 40 ? 'stroke-orange-500' :
                    riskPercentage > 20 ? 'stroke-yellow-500' : 'stroke-green-500'
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{riskPercentage}</span>
              </div>
            </div>
            <Badge variant={
              summary.riskLevel === 'Critical' ? 'critical' :
              summary.riskLevel === 'High' ? 'high' :
              summary.riskLevel === 'Medium' ? 'medium' : 'low'
            }>
              {summary.riskLevel || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        {[
          { label: 'Critical', count: summary.critical || 0, variant: 'critical', color: 'text-red-500' },
          { label: 'High', count: summary.high || 0, variant: 'high', color: 'text-orange-500' },
          { label: 'Medium', count: summary.medium || 0, variant: 'medium', color: 'text-yellow-500' },
          { label: 'Low', count: summary.low || 0, variant: 'low', color: 'text-blue-500' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
              <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partial Report Warning */}
      {isPartial && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Partial Report</p>
                  <p className="text-sm text-muted-foreground">
                    Showing {vulnerabilities.length} of {totalVulns} vulnerabilities. Upgrade to see all issues with AI remediation.
                  </p>
                </div>
              </div>
              <Button variant="glow" size="sm" onClick={() => navigate('/pricing')}>
                <Crown className="h-4 w-4 mr-1" /> Upgrade
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Vulnerabilities List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Vulnerabilities ({isPartial ? `${vulnerabilities.length} of ${totalVulns}` : vulnerabilities.length})
        </h2>

        <div className="space-y-3">
          {vulnerabilities.map((vuln, index) => {
            const colors = severityColors[vuln.severity] || severityColors.medium;
            const isExpanded = expandedVuln === vuln.id;

            return (
              <motion.div
                key={vuln.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className={`${colors.border} border`}>
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedVuln(isExpanded ? null : vuln.id)}
                  >
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                      <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={vuln.severity}>{vuln.severity?.toUpperCase()}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{vuln.cve_id}</span>
                        {vuln.cvss_score && (
                          <span className="text-xs text-muted-foreground">CVSS {vuln.cvss_score}</span>
                        )}
                      </div>
                      <p className="font-medium mt-1">{vuln.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{vuln.affected_component}</p>
                    </div>
                    {!isPartial && (
                      <div className="shrink-0">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    )}
                  </div>

                  {/* Expanded details (full report only) */}
                  {isExpanded && !isPartial && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-4">
                        <Tabs defaultValue="details">
                          <TabsList className="w-full justify-start">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="remediation">
                              <Wrench className="h-3.5 w-3.5 mr-1" /> Remediation
                            </TabsTrigger>
                            <TabsTrigger value="ai-fix">
                              <Brain className="h-3.5 w-3.5 mr-1" /> AI Fix
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="details" className="space-y-3 mt-3">
                            <div>
                              <p className="text-sm font-medium mb-1">Description</p>
                              <p className="text-sm text-muted-foreground">{vuln.description}</p>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <p className="text-sm font-medium">Affected Component</p>
                                <p className="text-sm text-muted-foreground font-mono">{vuln.affected_component}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Affected Version</p>
                                <p className="text-sm text-muted-foreground font-mono">{vuln.affected_version || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Fixed Version</p>
                                <p className="text-sm text-muted-foreground font-mono">{vuln.fixed_version || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">CVSS Score</p>
                                <p className="text-sm font-mono">
                                  <span className={colors.text}>{vuln.cvss_score}</span> / 10.0
                                </p>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="remediation" className="space-y-3 mt-3">
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Shield className="h-4 w-4 text-primary" /> Remediation
                              </p>
                              <p className="text-sm text-muted-foreground">{vuln.remediation}</p>
                            </div>
                            <Separator />
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Wrench className="h-4 w-4 text-primary" /> Patch Guidance
                              </p>
                              <p className="text-sm text-muted-foreground">{vuln.patch_guidance}</p>
                            </div>
                          </TabsContent>

                          <TabsContent value="ai-fix" className="mt-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium flex items-center gap-1">
                                  <Brain className="h-4 w-4 text-neon-purple" /> AI-Generated Fix
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(vuln.ai_fix, vuln.id)}
                                >
                                  {copiedId === vuln.id ? (
                                    <><Check className="h-3.5 w-3.5 mr-1" /> Copied</>
                                  ) : (
                                    <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>
                                  )}
                                </Button>
                              </div>
                              <pre className="text-sm bg-secondary rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
                                {vuln.ai_fix}
                              </pre>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
