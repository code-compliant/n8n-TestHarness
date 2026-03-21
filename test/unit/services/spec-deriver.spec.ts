import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpecDeriver } from '../../../src/services/spec-deriver';

describe('SpecDeriver', () => {
  it('generates email workflow spec with required assertions', async () => {
    const deriver = new SpecDeriver();
    const input = {
      workflowSlug: 'email-triage',
      workflowFamily: 'email',
      functionalRequirements: ['FR13', 'FR14', 'FR19']
    };

    const spec = await deriver.deriveSpec(input);

    assert.equal(spec.workflowSlug, 'email-triage');
    assert.equal(spec.source, 'auto-derived');
    assert.ok(spec.assertions.length > 0);

    // Should have global error handler check
    const errorHandler = spec.assertions.find(a => a.type === 'error_handler_check');
    assert.ok(errorHandler);
    assert.equal(errorHandler.spec.workflowId, 'RumKLiLA2onXkppj');

    // Should have email-specific assertions
    const classificationCheck = spec.assertions.find(a => a.type === 'classification_check');
    assert.ok(classificationCheck);
    assert.equal(classificationCheck.target, 'email_classifier');
  });

  it('includes global error handler for all workflow families', async () => {
    const deriver = new SpecDeriver();
    const testCases = ['email', 'calendar', 'quote', 'generic'];

    for (const family of testCases) {
      const spec = await deriver.deriveSpec({
        workflowSlug: `test-${family}`,
        workflowFamily: family,
        functionalRequirements: []
      });

      const errorHandler = spec.assertions.find(a => a.type === 'error_handler_check');
      assert.ok(errorHandler, `Missing error handler for ${family}`);
      assert.equal(errorHandler.spec.workflowId, 'RumKLiLA2onXkppj');
    }
  });

  it('extracts features from assertions correctly', async () => {
    const deriver = new SpecDeriver();
    const spec = await deriver.deriveSpec({
      workflowSlug: 'multi-feature-workflow',
      workflowFamily: 'email',
      functionalRequirements: []
    });

    assert.ok(spec.features.includes('core'));
    assert.ok(spec.features.includes('classify'));
    assert.ok(spec.features.includes('reply'));
    assert.ok(Array.isArray(spec.features));
  });

  it('uses generic template for unknown workflow family', async () => {
    const deriver = new SpecDeriver();
    const spec = await deriver.deriveSpec({
      workflowSlug: 'unknown-workflow',
      workflowFamily: 'unknown-type',
      functionalRequirements: []
    });

    assert.equal(spec.workflowSlug, 'unknown-workflow');
    assert.ok(spec.assertions.length >= 2); // At least error handler + schema match
  });
});