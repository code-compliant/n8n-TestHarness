export interface ElicitationRequest {
  workflowSlug: string;
  feature: string;
  nodeName?: string;
  context: string;
}

export interface ElicitationResponse {
  assertions: Array<{
    type: string;
    target: string;
    spec: unknown;
  }>;
  approvedBy: string;
  approvedAt: string;
}

export class ContractElicitor {
  async requestAssertionElicitation(request: ElicitationRequest): Promise<string> {
    // This would typically send a Telegram prompt to Chris
    // For now, we'll simulate the elicitation process

    const prompt = this.buildElicitationPrompt(request);
    console.log('Elicitation prompt:', prompt);

    // Return an elicitation ID for tracking
    return `elicit_${Date.now()}_${request.workflowSlug}`;
  }

  async processElicitationResponse(
    elicitationId: string,
    response: ElicitationResponse
  ): Promise<void> {
    // Process the human response and create assertions
    console.log(`Processing elicitation ${elicitationId}:`, response);

    // This would typically:
    // 1. Validate the response format
    // 2. Generate assertion IDs
    // 3. Create the assertions with proper spec format
    // 4. Add them to the contract
  }

  private buildElicitationPrompt(request: ElicitationRequest): string {
    let prompt = `🔧 Contract Update Required\n\n`;
    prompt += `Workflow: ${request.workflowSlug}\n`;
    prompt += `Feature: ${request.feature}\n`;

    if (request.nodeName) {
      prompt += `Node: ${request.nodeName}\n`;
    }

    prompt += `Context: ${request.context}\n\n`;

    prompt += `What quality assertions should be added for this ${request.feature} feature?\n\n`;

    prompt += `Available assertion types:\n`;
    prompt += `• classification_check - verify output is in allowed set\n`;
    prompt += `• schema_match - verify output has required fields\n`;
    prompt += `• side_effect_check - verify node executed successfully\n`;
    prompt += `• not_contains - verify output doesn't contain forbidden patterns\n`;
    prompt += `• llm_judge - use LLM to evaluate semantic quality\n`;
    prompt += `• perspective_check - verify author perspective (subset of llm_judge)\n\n`;

    prompt += `Please specify:\n`;
    prompt += `1. Assertion type\n`;
    prompt += `2. Target node name\n`;
    prompt += `3. Expected behavior/values\n\n`;

    prompt += `Reply with assertion details or "skip" to proceed without new assertions.`;

    return prompt;
  }

  async generateJudgePrompt(
    workflowFamily: string,
    assertionType: string,
    context: string
  ): Promise<string> {
    // Generate a judge prompt template for LLM assertions
    const template = this.buildJudgePromptTemplate(workflowFamily, assertionType, context);

    // In a real implementation, this might use an LLM to generate
    // a more sophisticated prompt based on the specific context
    return template;
  }

  private buildJudgePromptTemplate(
    workflowFamily: string,
    assertionType: string,
    context: string
  ): string {
    let prompt = `You are evaluating output from an n8n workflow node.\n\n`;

    // Add workflow family context
    switch (workflowFamily.toLowerCase()) {
      case 'email':
        prompt += `Context: This is an email automation workflow. `;
        prompt += `Chris (Managing Director, Dorian Engineering Consultants) uses this to manage client communications.\n`;
        break;
      case 'calendar':
        prompt += `Context: This is a calendar management workflow for scheduling and coordination.\n`;
        break;
      case 'quote':
        prompt += `Context: This is a quote generation workflow for engineering consulting services.\n`;
        break;
      default:
        prompt += `Context: This is a business automation workflow.\n`;
    }

    // Add assertion-specific instructions
    switch (assertionType) {
      case 'perspective_check':
        prompt += `Task: Verify the output is written from Chris's perspective as the consultant, not from the client's perspective.\n`;
        prompt += `Chris should sound professional, knowledgeable, and client-focused.\n`;
        break;
      default:
        prompt += `Task: Evaluate the output for correctness and quality.\n`;
    }

    prompt += `${context}\n\n`;

    prompt += `Evaluate the following output and respond with exactly one of: CORRECT / WRONG / UNCLEAR\n`;
    prompt += `Reason: <one sentence>\n\n`;

    prompt += `Output to evaluate:\n`;
    prompt += `{{ output }}\n`;

    return prompt;
  }
}