import * as fs from 'fs';

export type LLMJudgeResult = 'CORRECT' | 'WRONG' | 'UNCLEAR';

export interface JudgeResponse {
  result: LLMJudgeResult;
  reason: string;
}

export class LLMJudgeClient {
  async evaluateOutput(judgePromptPath: string, outputToEvaluate: unknown): Promise<JudgeResponse> {
    try {
      const promptTemplate = await this.loadJudgePrompt(judgePromptPath);
      const fullPrompt = this.buildJudgePrompt(promptTemplate, outputToEvaluate);

      // TODO: Replace with actual LLM client when available
      const mockResponse = await this.mockLLMCall(fullPrompt);
      return this.parseJudgeResponse(mockResponse);
    } catch (error) {
      console.error('LLM judge evaluation failed:', error);
      throw new Error(`Judge evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadJudgePrompt(promptPath: string): Promise<string> {
    try {
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load judge prompt from ${promptPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildJudgePrompt(template: string, output: unknown): string {
    const outputString = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
    return template.replace(/\{\{\s*output\s*\}\}/g, outputString);
  }

  private async mockLLMCall(prompt: string): Promise<string> {
    // Mock implementation - in real scenario this would call an LLM service
    console.log('LLM judge prompt length:', prompt.length);

    // Simple mock logic based on prompt content
    if (prompt.toLowerCase().includes('error') || prompt.toLowerCase().includes('fail')) {
      return 'WRONG: The output contains errors or failures.';
    }

    if (prompt.toLowerCase().includes('placeholder') || prompt.toLowerCase().includes('todo')) {
      return 'WRONG: The output contains placeholder content.';
    }

    if (prompt.toLowerCase().includes('perspective') && prompt.toLowerCase().includes('client')) {
      return 'WRONG: The output is written from client perspective instead of consultant perspective.';
    }

    // Default to correct for most cases
    return 'CORRECT: The output meets the specified requirements.';
  }

  private parseJudgeResponse(response: string): JudgeResponse {
    const cleanResponse = response.trim();

    // Extract the result (CORRECT/WRONG/UNCLEAR) from the beginning
    let result: LLMJudgeResult = 'UNCLEAR';
    let reason = cleanResponse;

    if (cleanResponse.startsWith('CORRECT')) {
      result = 'CORRECT';
      reason = cleanResponse.replace(/^CORRECT:?\s*/, '');
    } else if (cleanResponse.startsWith('WRONG')) {
      result = 'WRONG';
      reason = cleanResponse.replace(/^WRONG:?\s*/, '');
    } else if (cleanResponse.startsWith('UNCLEAR')) {
      result = 'UNCLEAR';
      reason = cleanResponse.replace(/^UNCLEAR:?\s*/, '');
    }

    // If no reason provided, create a default one
    if (!reason.trim()) {
      reason = `Judge result: ${result}`;
    }

    return { result, reason };
  }
}