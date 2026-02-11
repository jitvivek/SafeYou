import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Shield, Download, FileText, AlertTriangle,
  Brain, Wrench, Lock,
} from 'lucide-react';

export default function ReportPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [scanId]);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await api.getReport(scanId);
      setReport(data.report);
    } catch (err) {
      toast({ title: 'Error loading report', description: err.message, variant: 'destructive' });
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
      a.download = `safeyou-report.${format === 'json' ? 'json' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Download failed', description: err.data?.message || err.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Security Report
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload('json')}>
                <Download className="h-4 w-4 mr-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload('txt')}>
                <Download className="h-4 w-4 mr-1" /> TXT
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Repository Info */}
          <div>
            <h3 className="font-medium mb-2">Repository</h3>
            <p className="text-sm">{report.repository?.name}</p>
            {report.repository?.url && (
              <p className="text-sm text-muted-foreground">{report.repository.url}</p>
            )}
          </div>

          <Separator />

          {/* Summary */}
          <div>
            <h3 className="font-medium mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <div key={sev} className="text-center p-3 rounded-lg bg-secondary/50">
                  <Badge variant={sev} className="mb-1">{sev.toUpperCase()}</Badge>
                  <p className="text-2xl font-bold">{report.summary?.[sev] || 0}</p>
                </div>
              ))}
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <Badge variant="outline" className="mb-1">TOTAL</Badge>
                <p className="text-2xl font-bold">{report.summary?.total || 0}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vulnerabilities */}
          <div>
            <h3 className="font-medium mb-3">
              Vulnerabilities ({report.vulnerabilities?.length || 0}
              {report.isPartialReport ? ` of ${report.totalVulnerabilities}` : ''})
            </h3>

            {report.isPartialReport && (
              <div className="bg-primary/10 rounded-lg p-4 mb-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Partial Report</p>
                  <p className="text-sm text-muted-foreground">{report.upgradeMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {report.vulnerabilities?.map((vuln, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={vuln.severity}>{vuln.severity?.toUpperCase()}</Badge>
                    <span className="font-mono text-sm">{vuln.cve_id}</span>
                    {vuln.cvss_score && <span className="text-sm text-muted-foreground">CVSS {vuln.cvss_score}</span>}
                  </div>
                  <p className="font-medium">{vuln.title}</p>
                  {vuln.description && <p className="text-sm text-muted-foreground">{vuln.description}</p>}
                  {vuln.remediation && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded">
                      <p className="text-sm font-medium flex items-center gap-1 mb-1">
                        <Wrench className="h-3.5 w-3.5" /> Remediation
                      </p>
                      <p className="text-sm text-muted-foreground">{vuln.remediation}</p>
                    </div>
                  )}
                  {vuln.ai_fix && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded">
                      <p className="text-sm font-medium flex items-center gap-1 mb-1">
                        <Brain className="h-3.5 w-3.5 text-neon-purple" /> AI Fix
                      </p>
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">{vuln.ai_fix}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
