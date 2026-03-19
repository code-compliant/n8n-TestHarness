export type CredentialBindingStatus = 'safe' | 'unsafe' | 'missing' | 'unknown';
export type EnvironmentName = 'test' | 'production';
export type Environment = EnvironmentName;

export interface CredentialBindingState {
  candidateId: string;
  environment: EnvironmentName;
  status: CredentialBindingStatus;
  bindingId?: string;
}

export interface CredentialBinding {
  environment: Environment;
  credentialKey: string;
  reference: string;
  rollbackReference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialRequirement {
  credentialKey: string;
  referenceEnvVar: string;
}

export interface CredentialValidationResult {
  status: 'pass' | 'blocked';
  environment: Environment;
  missing: string[];
  invalid: string[];
  remediation: string;
}

export interface SetupActionStep {
  action: string;
  status: 'success' | 'failed' | 'skipped';
  detail?: string;
}

export interface SetupOutcome {
  setupId: string;
  candidateId: string;
  environment: Environment;
  actor: string;
  status: 'success' | 'failed' | 'manual_required';
  actionSequence: SetupActionStep[];
  fixtureSeeded: boolean;
  manualGuidance?: string[];
}

export interface RotationOutcome {
  rotationId: string;
  candidateId: string;
  actor: string;
  fromEnvironment: Environment;
  toEnvironment: Environment;
  credentialKey: string;
  previousReference: string;
  newReference: string;
  rollbackReference: string;
}
