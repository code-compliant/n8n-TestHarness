import assert from 'node:assert';
import { describe, it } from 'node:test';

import { PromotionService } from '../../../src/services/promotion-service';
import type { PromotionAction } from '../../../src/domain/models/promotion';
import type { CredentialBindingState } from '../../../src/domain/models/credentials';

describe('PromotionService', () => {
  const service = new PromotionService();

  const baseAction: PromotionAction = {
    id: 'action-1',
    candidateId: 'candidate-1',
    actor: 'operator-1',
    fromEnvironment: 'test',
    toEnvironment: 'production',
    actionType: 'audited_deployment',
    deploymentId: 'deploy-1',
  };

  const baseCredential: CredentialBindingState = {
    candidateId: 'candidate-1',
    environment: 'test',
    status: 'safe',
  };

  it('rejects promotion when audited deployment is missing across boundary', () => {
    const result = service.requestPromotion(
      { ...baseAction, actionType: 'manual' },
      baseCredential,
    );

    assert.equal(result.approved, false);
    assert.equal(result.reason, 'environment_boundary_requires_audited_deployment');
  });

  it('rejects promotion when credential binding is unsafe', () => {
    const result = service.requestPromotion(
      baseAction,
      { ...baseCredential, status: 'unsafe' },
    );

    assert.equal(result.approved, false);
    assert.equal(result.reason, 'credential_state_unsafe');
  });

  it('approves audited promotion with safe credential state', () => {
    const result = service.requestPromotion(baseAction, baseCredential);

    assert.equal(result.approved, true);
    assert.ok(result.promotionId);
  });
});
