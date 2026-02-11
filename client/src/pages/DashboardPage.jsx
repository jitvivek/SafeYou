import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, GitBranch, Upload, ScanSearch, FileText,
  AlertTriangle, ShieldCheck, Clock, Trash2, Play,
  FolderGit2, HardDrive, Crown, ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [repos, setRepos] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [binaryName, setBinaryName] = useState('');
  const [binaryFileName, setBinaryFileName] = useState('');
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [repoData, scanData] = await Promise.all([api.getRepos(), api.getScans()]);
      setRepos(repoData.repos || []);
      setScans(scanData.scans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRepo(e) {
    e.preventDefault();
    try {
      const name = repoName || repoUrl.split('/').pop() || 'New Repository';
      await api.addRepo({ name, url: repoUrl, type: 'git' });
      toast({ title: 'Repository added', description: `${name} has been added successfully.` });
      setAddRepoOpen(false);
      setRepoUrl('');
      setRepoName('');
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add repository', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUploadBinary(e) {
    e.preventDefault();
    try {
      await api.uploadBinary({ name: binaryName, fileName: binaryFileName, fileSize: Math.floor(Math.random() * 50000000) });
      toast({ title: 'Binary uploaded', description: `${binaryName} has been added.` });
      setUploadOpen(false);
      setBinaryName('');
      setBinaryFileName('');
      loadData();
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
  }

  async function handleStartScan(repoId) {
    setScanningRepoId(repoId);
    setScanProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const data = await api.startScan(repoId);
      clearInterval(interval);
      setScanProgress(100);

      toast({
        title: 'Scan complete!',
        description: `Found ${data.scanResult?.total || 0} vulnerabilities.`,
      });

      await refreshUser();
      loadData();

      // Navigate to results after brief delay
      setTimeout(() => {
        navigate(`/dashboard/scan/${data.scan.id}`);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      if (err.data?.upgradeRequired) {
        toast({
          title: 'Upgrade required',
          description: err.data.message || 'You need to upgrade your plan.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setTimeout(() => {
        setScanningRepoId(null);
        setScanProgress(0);
      }, 1000);
    }
  }

  async function handleDeleteRepo(repoId) {
    try {
      await api.deleteRepo(repoId);
      toast({ title: 'Repository removed' });
      loadData();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  }

  const severityColor = (severity) => {
    const colors = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-yellow-500', low: 'text-blue-500' };
    return colors[severity] || 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome / Stats Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground">
            {user?.plan === 'trial'
              ? `${user.trial_scans_remaining} trial scans remaining`
              : `${user.scans_this_month} scans this month`}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addRepoOpen} onOpenChange={setAddRepoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <GitBranch className="h-4 w-4" /> Add Repository
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Repository</DialogTitle>
                <DialogDescription>Enter a Git repository URL to scan for vulnerabilities.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRepo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-url">Repository URL</Label>
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/user/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-name">Name (optional)</Label>
                  <Input
                    id="repo-name"
                    placeholder="My Project"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="glow">Add Repository</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" /> Upload Binary
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Binary</DialogTitle>
                <DialogDescription>Add a binary file for vulnerability analysis.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadBinary} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="binary-name">Project Name</Label>
                  <Input
                    id="binary-name"
                    placeholder="My Application"
                    value={binaryName}
                    onChange={(e) => setBinaryName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="binary-file">File Name</Label>
                  <Input
                    id="binary-file"
                    placeholder="app.jar, server.exe, main.py"
                    value={binaryFileName}
                    onChange={(e) => setBinaryFileName(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="glow">Upload & Add</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Plan upgrade banner for trial users */}
      {user?.plan === 'trial' && user?.trial_scans_remaining <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Upgrade to Pro</p>
                  <p className="text-sm text-muted-foreground">
                    Get full reports, AI remediation, and 50 scans/month for $29/mo
                  </p>
                </div>
              </div>
              <Button variant="glow" size="sm" onClick={() => navigate('/pricing')}>
                Upgrade <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Repositories & Scans */}
      <Tabs defaultValue="repos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repos" className="gap-2">
            <FolderGit2 className="h-4 w-4" /> Repositories ({repos.length})
          </TabsTrigger>
          <TabsTrigger value="scans" className="gap-2">
            <ScanSearch className="h-4 w-4" /> Scan History ({scans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repos">
          {repos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FolderGit2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a Git repository or upload a binary to start scanning.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddRepoOpen(true)}>
                    <GitBranch className="h-4 w-4 mr-2" /> Add Repository
                  </Button>
                  <Button variant="outline" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Upload Binary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {repos.map((repo) => (
                  <motion.div
                    key={repo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {repo.type === 'git' ? (
                              <GitBranch className="h-5 w-5 text-primary" />
                            ) : (
                              <HardDrive className="h-5 w-5 text-neon-blue" />
                            )}
                            <CardTitle className="text-base">{repo.name}</CardTitle>
                          </div>
                          <button
                            onClick={() => handleDeleteRepo(repo.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete repository"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <CardDescription className="text-xs truncate">
                          {repo.url || repo.file_name || 'Binary upload'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <ScanSearch className="h-3.5 w-3.5" /> {repo.scan_count || 0} scans
                          </span>
                          {repo.last_scan_status && (
                            <Badge variant={repo.last_scan_status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {repo.last_scan_status}
                            </Badge>
                          )}
                        </div>

                        {scanningRepoId === repo.id && (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-primary">Scanning...</span>
                              <span>{Math.round(scanProgress)}%</span>
                            </div>
                            <Progress value={scanProgress} className="h-2" />
                          </div>
                        )}
                      </CardContent>
                      <div className="p-4 pt-0">
                        <Button
                          variant="glow"
                          className="w-full gap-2"
                          onClick={() => handleStartScan(repo.id)}
                          disabled={scanningRepoId === repo.id}
                        >
                          {scanningRepoId === repo.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" /> Run Scan
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="scans">
          {scans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ScanSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No scans yet</h3>
                <p className="text-sm text-muted-foreground">
                  Run a scan on a repository to see results here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="cursor-pointer hover:glow-green transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => navigate(`/dashboard/scan/${scan.id}`)}
                  >
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          scan.status === 'completed' ? 'bg-primary/10' : 'bg-secondary'
                        }`}>
                          {scan.status === 'completed' ? (
                            <ShieldCheck className="h-5 w-5 text-primary" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{scan.repo_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(scan.completed_at || scan.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {scan.summary && scan.status === 'completed' && (
                          <>
                            <span className="text-sm font-medium">
                              {scan.total_vulnerabilities} issues
                            </span>
                            <div className="flex gap-1">
                              {scan.summary.critical > 0 && <Badge variant="critical" className="text-xs">{scan.summary.critical}C</Badge>}
                              {scan.summary.high > 0 && <Badge variant="high" className="text-xs">{scan.summary.high}H</Badge>}
                              {scan.summary.medium > 0 && <Badge variant="medium" className="text-xs">{scan.summary.medium}M</Badge>}
                              {scan.summary.low > 0 && <Badge variant="low" className="text-xs">{scan.summary.low}L</Badge>}
                            </div>
                          </>
                        )}
                        <Badge variant={scan.status === 'completed' ? 'default' : 'secondary'}>
                          {scan.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
