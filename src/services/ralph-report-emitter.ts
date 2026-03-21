import * as fs from 'fs';
import * as path from 'path';
import type { RalphReport, RequirementCoverageEntry, IterationLogEntry } from '../domain/models/ralph-report';
import type { RalphLoopRecord } from '../domain/models/ralph-loop';
import type { AssessmentResult } from '../domain/models/assessment-result';
import type { FixDelta } from '../domain/models/fix-delta';
import { NextStepAdvisor } from './next-step-advisor';

export interface ReportGenerationOptions {
  loopRecord: RalphLoopRecord;
  iterationResults: IterationResult[];
  finalFailureDelta?: FixDelta;
}

export interface IterationResult {
  iterationNumber: number;
  status: 'PASS' | 'FAIL';
  assessmentResult?: AssessmentResult;
  fixDelta?: FixDelta;
  runtimeErrors: string[];
}

export class RalphReportEmitter {
  private readonly nextStepAdvisor: NextStepAdvisor;

  constructor() {
    this.nextStepAdvisor = new NextStepAdvisor();
  }

  async generateReport(options: ReportGenerationOptions): Promise<string> {
    const report = await this.buildReport(options);
    const reportPath = await this.writeReportToFile(report);

    console.log(`Ralph report generated: ${reportPath}`);
    return reportPath;
  }

  private async buildReport(options: ReportGenerationOptions): Promise<RalphReport> {
    const { loopRecord, iterationResults, finalFailureDelta } = options;

    // Generate suggested next steps if loop failed
    let suggestedNextSteps: string[] = [];
    if (finalFailureDelta && loopRecord.status !== 'PASS') {
      suggestedNextSteps = await this.nextStepAdvisor.generateNextSteps(finalFailureDelta);
    }

    return {
      workflowSlug: loopRecord.workflowSlug,
      status: loopRecord.status,
      iterationsRun: loopRecord.currentIteration,
      maxIterations: loopRecord.maxIterations,
      generatedAt: new Date().toISOString(),
      requirementsCoverage: this.buildRequirementsCoverage(iterationResults),
      iterationLog: this.buildIterationLog(iterationResults),
      suggestedNextSteps
    };
  }

  private buildRequirementsCoverage(iterationResults: IterationResult[]): RequirementCoverageEntry[] {
    const coverage: RequirementCoverageEntry[] = [];

    // Get the final iteration's assessment result for coverage
    const finalIteration = iterationResults[iterationResults.length - 1];
    if (finalIteration?.assessmentResult) {
      finalIteration.assessmentResult.assertions.forEach(assertionResult => {
        coverage.push({
          functionalRequirement: this.mapAssertionToFR(assertionResult.assertion.type),
          assertion: `${assertionResult.assertion.type}: ${assertionResult.assertion.target}`,
          status: assertionResult.status
        });
      });
    }

    return coverage;
  }

  private buildIterationLog(iterationResults: IterationResult[]): IterationLogEntry[] {
    return iterationResults.map(result => {
      const failedAssertions = result.assessmentResult?.assertions
        .filter(a => a.status === 'FAIL')
        .map(a => `${a.assertion.type} (${a.assertion.target})`) || [];

      const fixApplied = result.fixDelta?.generatorPrompt
        ? this.extractFixSummary(result.fixDelta.generatorPrompt)
        : undefined;

      return {
        iterationNumber: result.iterationNumber,
        status: result.status,
        runtimeErrors: result.runtimeErrors,
        failedAssertions,
        fixApplied
      };
    });
  }

  private mapAssertionToFR(assertionType: string): string {
    // Map assertion types to functional requirements
    switch (assertionType) {
      case 'classification_check':
        return 'FR14';
      case 'error_handler_check':
        return 'FR19';
      case 'perspective_check':
        return 'FR14';
      case 'context_injection_audit':
        return 'FR14';
      case 'schema_match':
        return 'FR13';
      case 'side_effect_check':
        return 'FR15';
      default:
        return 'FR??';
    }
  }

  private extractFixSummary(generatorPrompt: string): string {
    // Extract a brief summary of the fix from the generator prompt
    const lines = generatorPrompt.split('\n').filter(line => line.trim().length > 0);

    // Find the first "Fix:" line for a brief summary
    const fixLine = lines.find(line => line.includes('Fix:'));
    if (fixLine) {
      return fixLine.replace(/^\s*\d+\.\s*/, '').replace('Fix:', '').trim();
    }

    // Fallback to first substantive line
    return 'Applied automatic fixes for failed assertions';
  }

  private async writeReportToFile(report: RalphReport): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `ralph-report-${report.workflowSlug}-${timestamp}.md`;
    const reportPath = path.join(process.cwd(), '_bmad-output', 'ralph-reports', filename);

    const markdown = this.renderReportAsMarkdown(report);

    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, markdown, 'utf-8');
    return reportPath;
  }

  private renderReportAsMarkdown(report: RalphReport): string {
    let md = `# Ralph Report — ${report.workflowSlug}\n\n`;
    md += `Generated: ${report.generatedAt}\n`;
    md += `Status: **${report.status}**\n`;
    md += `Iterations run: ${report.iterationsRun} / ${report.maxIterations}\n\n`;

    // Requirements Coverage
    md += `## Requirements Coverage\n\n`;
    md += `| FR | Assertion | Status |\n`;
    md += `|----|-----------|--------|\n`;

    report.requirementsCoverage.forEach(coverage => {
      const statusIcon = coverage.status === 'PASS' ? '✅' : coverage.status === 'FAIL' ? '❌' : '⚠️';
      md += `| ${coverage.functionalRequirement} | ${coverage.assertion} | ${statusIcon} ${coverage.status} |\n`;
    });
    md += '\n';

    // Iteration Log
    md += `## Iteration Log\n\n`;

    report.iterationLog.forEach(iteration => {
      md += `### Iteration ${iteration.iterationNumber}\n`;
      md += `- Status: **${iteration.status}**\n`;

      if (iteration.runtimeErrors.length > 0) {
        md += `- Runtime errors: ${iteration.runtimeErrors.join(', ')}\n`;
      }

      if (iteration.failedAssertions.length > 0) {
        md += `- Failed assertions: ${iteration.failedAssertions.join(', ')}\n`;
      }

      if (iteration.fixApplied) {
        md += `- Fix applied: ${iteration.fixApplied}\n`;
      }

      md += '\n';
    });

    // Suggested Next Steps
    if (report.suggestedNextSteps.length > 0) {
      md += `## Suggested Next Steps\n\n`;
      report.suggestedNextSteps.forEach(step => {
        md += `- ${step}\n`;
      });
      md += '\n';
    }

    return md;
  }
}