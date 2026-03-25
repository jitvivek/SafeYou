import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runScan, generatePartialReport } from '../engine/scanner.js';
import { runBinaryAnalysis, generateBinaryPartialReport } from '../engine/binaryAnalyzer.js';

const router = Router();

// POST /api/public/scan - Quick scan without login (returns partial report)
router.post('/scan', async (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url && !name) {
      return res.status(400).json({ error: 'Repository URL or name is required' });
    }

    const mockRepo = {
      id: uuidv4(),
      name: name || url,
      url: url || '',
      type: 'git',
      file_name: null,
    };

    // Run both analyses in parallel
    const [scanResult, binaryResult] = await Promise.all([
      runScan(mockRepo),
      runBinaryAnalysis(mockRepo),
    ]);

    const partialReport = generatePartialReport(scanResult);
    const binaryReport = generateBinaryPartialReport(binaryResult);

    res.json({
      scanId: uuidv4(),
      report: partialReport,
      binaryReport,
      message: 'This is a partial report. Sign up to see the full vulnerability analysis.',
    });
  } catch (err) {
    console.error('Public scan error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

export default router;
