import type { CredentialBindingState } from '../domain/models/credentials';
import type { PromotionAction } from '../domain/models/promotion';
import { deterministicId } from '../shared/util/ids';

export interface PromotionPolicyResult {
  approved: boolean;
  reason?: string;
  promotionId?: string;
}

export class PromotionService {
  requestPromotion(action: PromotionAction, credentialState: CredentialBindingState): PromotionPolicyResult {
    if (action.fromEnvironment !== action.toEnvironment) {
      if (action.actionType !== 'audited_deployment') {
        return {
          approved: false,
          reason: 'environment_boundary_requires_audited_deployment',
        };
      }

      if (credentialState.status !== 'safe') {
        return {
          approved: false,
          reason: `credential_state_${credentialState.status}`,
        };
      }
    }

    return {
      approved: true,
      promotionId: deterministicId('promotion', {
        candidateId: action.candidateId,
        from: action.fromEnvironment,
        to: action.toEnvironment,
        deploymentId: action.deploymentId ?? null,
      }),
    };
  }
}
