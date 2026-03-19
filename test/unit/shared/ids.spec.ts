import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildId } from '../../../src/shared/util/ids';

describe('buildId', () => {
  it('generates deterministic sha256-based ids from components', () => {
    const first = buildId('setup', 'candidate-1', 'test', 'operator');
    const second = buildId('setup', 'candidate-1', 'test', 'operator');
    const third = buildId('setup', 'candidate-2', 'test', 'operator');

    assert.equal(first, second);
    assert.notEqual(first, third);
    assert.match(first, /^setup_[a-f0-9]{32}$/);
  });
});
