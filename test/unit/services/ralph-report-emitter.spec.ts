import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import { RalphReportEmitter } from '../../../src/services/ralph-report-emitter';
import type { RalphLoopRecord } from '../../../src/domain/models/ralph-loop';

describe('RalphReportEmitter', () => {
  const emitter = new RalphReportEmitter();

  it('generates report with basic loop information', async () => {
    const loopRecord: RalphLoopRecord = {
      loopId: 'test-loop-123',
      workflowSlug: 'email-triage',
      status: 'EXHAUSTED',
      currentIteration: 5,
      maxIterations: 5,
      startedAt: '2026-03-21T10:00:00Z',
      lastActionAt: '2026-03-21T10:30:00Z',
      completedAt: '2026-03-21T10:30:00Z'
    };

    const iterationResults = [
      {
        iterationNumber: 1,
        status: 'FAIL' as const,
        runtimeErrors: ['Connection timeout in Email Node'],
        assessmentResult: {
          passCount: 2,
          failCount: 1,
          warnCount: 0,
          overallStatus: 'FAIL' as const,
          evaluatedAt: '2026-03-21T10:05:00Z',
          assertions: [{
            assertion: {
              id: 'classification-check',
              feature: 'classify',
              type: 'classification_check',
              target: 'classifier',
              spec: {}
            },
            status: 'FAIL' as const,
            message: 'Classification failed',
            evaluatedAt: '2026-03-21T10:05:00Z'
          }]
        }
      }
    ];

    const reportPath = await emitter.generateReport({
      loopRecord,
      iterationResults
    });

    // Verify file was created
    assert.ok(fs.existsSync(reportPath));

    // Read and verify report content
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(reportContent.includes('# Ralph Report — email-triage'));
    assert.ok(reportContent.includes('Status: **EXHAUSTED**'));
    assert.ok(reportContent.includes('Iterations run: 5 / 5'));
    assert.ok(reportContent.includes('## Requirements Coverage'));
    assert.ok(reportContent.includes('## Iteration Log'));
    assert.ok(reportContent.includes('### Iteration 1'));

    // Clean up test file
    fs.unlinkSync(reportPath);
  });

  it('includes suggested next steps for failed loops', async () => {
    const loopRecord: RalphLoopRecord = {
      loopId: 'test-loop-456',
      workflowSlug: 'test-workflow',
      status: 'EXHAUSTED',
      currentIteration: 3,
      maxIterations: 5,
      startedAt: '2026-03-21T10:00:00Z',
      lastActionAt: '2026-03-21T10:15:00Z',
      completedAt: '2026-03-21T10:15:00Z'
    };

    const finalFailureDelta = {
      iterationNumber: 3,
      failedAssertions: [{
        assertionType: 'classification_check',
        target: 'classifier',
        expected: ['urgent', 'routine'],
        actual: 'invalid',
        suggestedFix: 'Update classification logic'
      }],
      runtimeErrors: [],
      generatorPrompt: 'Fix the classification...'
    };

    const reportPath = await emitter.generateReport({
      loopRecord,
      iterationResults: [],
      finalFailureDelta
    });

    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(reportContent.includes('## Suggested Next Steps'));

    // Clean up test file
    fs.unlinkSync(reportPath);
  });

  it('creates report directory if it does not exist', async () => {
    // Temporarily remove the reports directory
    const reportsDir = path.join(process.cwd(), '_bmad-output', 'ralph-reports');
    const tempDir = path.join(process.cwd(), '_bmad-output', 'ralph-reports-backup');

    if (fs.existsSync(reportsDir)) {
      fs.renameSync(reportsDir, tempDir);
    }

    const loopRecord: RalphLoopRecord = {
      loopId: 'test-loop-789',
      workflowSlug: 'test-create-dir',
      status: 'PASS',
      currentIteration: 1,
      maxIterations: 5,
      startedAt: '2026-03-21T10:00:00Z',
      lastActionAt: '2026-03-21T10:01:00Z',
      completedAt: '2026-03-21T10:01:00Z'
    };

    const reportPath = await emitter.generateReport({
      loopRecord,
      iterationResults: []
    });

    // Verify directory was created and report exists
    assert.ok(fs.existsSync(reportsDir));
    assert.ok(fs.existsSync(reportPath));

    // Clean up
    fs.unlinkSync(reportPath);
    fs.rmdirSync(reportsDir);

    // Restore original directory if it existed
    if (fs.existsSync(tempDir)) {
      fs.renameSync(tempDir, reportsDir);
    }
  });
});