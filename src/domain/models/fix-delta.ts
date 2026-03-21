import type { RuntimeFailure } from './runtime-result';

export interface FixDelta {
  iterationNumber: number;
  failedAssertions: {
    assertionType: string;
    target: string;
    expected: unknown;
    actual: unknown;
    suggestedFix: string;
  }[];
  runtimeErrors: RuntimeFailure[];
  generatorPrompt: string;
}