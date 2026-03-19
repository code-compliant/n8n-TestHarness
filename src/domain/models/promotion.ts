import type { EnvironmentName } from './credentials';

export interface PromotionAction {
  id: string;
  candidateId: string;
  actor: string;
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  actionType: 'audited_deployment' | 'manual';
  deploymentId?: string;
}
