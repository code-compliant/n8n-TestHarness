import assert from 'node:assert';
import { describe, it } from 'node:test';
import { RuntimeLogCapture } from '../../../src/services/runtime-log-capture';

describe('RuntimeLogCapture', () => {
  const capture = new RuntimeLogCapture();

  it('parses successful execution log correctly', () => {
    const logData = {
      id: 'exec-123',
      startedAt: '2026-03-21T10:00:00Z',
      stoppedAt: '2026-03-21T10:00:05Z',
      data: {
        resultData: {
          runData: {
            'node1': [{
              nodeName: 'Start Node',
              data: { main: [{ value: 'success' }] },
              executionTime: 100
            }],
            'node2': [{
              nodeName: 'Process Node',
              data: { main: [{ result: 'processed' }] },
              executionTime: 200
            }]
          }
        }
      }
    };

    const result = capture.parseExecutionLog(logData);

    assert.equal(result.executionId, 'exec-123');
    assert.equal(result.status, 'success');
    assert.equal(result.nodeResults.length, 2);
    assert.equal(result.errors.length, 0);
    assert.equal(result.nodeResults[0].nodeName, 'Start Node');
    assert.equal(result.nodeResults[1].nodeName, 'Process Node');
  });

  it('parses failed execution log with node errors', () => {
    const logData = {
      id: 'exec-456',
      startedAt: '2026-03-21T10:00:00Z',
      stoppedAt: '2026-03-21T10:00:03Z',
      data: {
        resultData: {
          runData: {
            'node1': [{
              nodeName: 'Start Node',
              data: { main: [{ value: 'success' }] },
              executionTime: 100
            }],
            'node2': [{
              nodeName: 'Failed Node',
              error: {
                name: 'ValidationError',
                message: 'Invalid input data'
              }
            }]
          }
        }
      }
    };

    const result = capture.parseExecutionLog(logData);

    assert.equal(result.executionId, 'exec-456');
    assert.equal(result.status, 'failed');
    assert.equal(result.nodeResults.length, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].nodeName, 'Failed Node');
    assert.equal(result.errors[0].errorType, 'ValidationError');
  });

  it('extracts error summary correctly', () => {
    const result = {
      executionId: 'test',
      status: 'failed' as const,
      nodeResults: [],
      errors: [
        {
          nodeId: 'node1',
          nodeName: 'Node 1',
          errorMessage: 'Connection failed',
          errorType: 'NetworkError',
          executionId: 'test'
        },
        {
          nodeId: 'node2',
          nodeName: 'Node 2',
          errorMessage: 'Validation error',
          errorType: 'ValidationError',
          executionId: 'test'
        }
      ],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const summary = capture.extractErrorSummary(result);
    assert.equal(summary, 'Node 1: Connection failed; Node 2: Validation error');
  });

  it('returns "No errors" for successful execution', () => {
    const result = {
      executionId: 'test',
      status: 'success' as const,
      nodeResults: [],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const summary = capture.extractErrorSummary(result);
    assert.equal(summary, 'No errors');
  });
});