/**
 * Centralized prompt management for autonomous crawler
 * 
 * This module provides clean separation between:
 * - Business objectives (what to accomplish)  
 * - System behavior (how to behave)
 * - Execution instructions (what to do now)
 */

export interface CrawlerObjectives {
  primary: string;
  deliverables: string[];
  priorities: {
    primary: string[];
    secondary: string[];
    highValue: string[];
  };
}

export interface PromptTemplates {
  systemPrompt: string;
  executionTemplate: string;
  businessObjectives: CrawlerObjectives;
}

/**
 * Default business objectives for analytics discovery
 * This should be configurable or passed as parameter
 */
export const DEFAULT_ANALYTICS_OBJECTIVES: CrawlerObjectives = {
  primary: "PRODUCT ANALYTICS & INSTRUMENTATION DISCOVERY",
  deliverables: [
    "Complete sitemap with feature classification",
    "Analytics instrumentation recommendations for each page", 
    "User journey flows with conversion tracking points",
    "SDK detection results and event mapping",
    "Recommended tracking implementation plan",
    "Product metrics and KPI identification opportunities"
  ],
  priorities: {
    primary: [
      "User registration, login, account creation",
      "Purchase flows, subscription upgrades, payment processes",
      "Feature activation, configuration, and first-use events", 
      "Content creation, file uploads, data submissions",
      "Critical user decisions and conversion points"
    ],
    secondary: [
      "Navigation patterns, search behavior, filtering/sorting",
      "Content engagement, modal opens, tab switches",
      "Settings changes, preference updates, customizations",
      "Social sharing, invitations, referral actions"
    ],
    highValue: [
      "Trial-to-paid conversions, subscription changes",
      "Feature discovery moments, help/support interactions", 
      "Error states, abandonment points, friction detection",
      "Cross-feature usage patterns, integration activations"
    ]
  }
};

/**
 * Concise system prompt focused on core behavior
 * Removed tool usage details (tools have their own descriptions)
 */
export const AUTONOMOUS_CRAWLER_SYSTEM_PROMPT = `You are an advanced autonomous web crawler agent with 100% AI-driven decision making.

CORE PHILOSOPHY:
- ALL exploration decisions made by AI analysis, not hardcoded rules
- Pure data extraction → AI interpretation → autonomous action  
- Adapt to ANY website through intelligent analysis

YOUR MISSION: Navigate and analyze websites autonomously, discovering features and relationships through AI-driven exploration.

EXPLORATION STRATEGY:
1. **Authentication First**: Always start with auto_login tool
2. **AI-Driven Discovery**: Use discover_global_navigation for AI navigation analysis
3. **Autonomous Exploration**: Let AI decide navigation priority and stopping points
4. **Pattern Recognition**: Use AI to detect and avoid redundant content
5. **Intelligent Completion**: AI determines when sufficient exploration achieved

CRITICAL BEHAVIORS:
- Never use hardcoded patterns - all decisions from AI analysis
- Prioritize feature-revealing actions over basic navigation
- Focus on business value and user workflow discovery
- Provide comprehensive findings with actionable insights

TOOL USAGE: Each tool has detailed descriptions - follow them exactly for parameter formatting.`;

/**
 * Template for execution instructions
 * This gets populated with specific objectives and credentials
 */
export const EXECUTION_INSTRUCTION_TEMPLATE = `START IMMEDIATELY WITH AUTHENTICATION:

Call auto_login tool with these credentials:
{credentials}

After successful authentication, proceed with the discovery mission:

{businessObjectives}

Focus on discovering:
- Core features and user workflows
- Business-critical interaction points  
- Analytics instrumentation opportunities
- User journey and conversion paths

Provide comprehensive findings including navigation structure, features analyzed, business value assessment, and authentication requirements.`;

/**
 * Create system prompt with optional customization
 */
export function createSystemPrompt(customization?: string): string {
  const basePrompt = AUTONOMOUS_CRAWLER_SYSTEM_PROMPT;
  return customization ? `${basePrompt}\n\nADDITIONAL CONTEXT:\n${customization}` : basePrompt;
}

/**
 * Create execution instructions with objectives and credentials
 */
export function createExecutionInstructions(
  objectives: CrawlerObjectives = DEFAULT_ANALYTICS_OBJECTIVES,
  credentials?: { username: string; password: string }
): string {
  const credentialString = credentials 
    ? `{"username_or_email": "${credentials.username}", "password": "${credentials.password}"}`
    : '{}';

  const objectiveString = formatObjectives(objectives);

  return EXECUTION_INSTRUCTION_TEMPLATE
    .replace('{credentials}', credentialString)
    .replace('{businessObjectives}', objectiveString);
}

/**
 * Format business objectives into readable prompt format
 */
function formatObjectives(objectives: CrawlerObjectives): string {
  const { primary, deliverables, priorities } = objectives;
  
  return `${primary}:

DELIVERABLES:
${deliverables.map(d => `✅ ${d}`).join('\n')}

INSTRUMENTATION PRIORITIES:
🎯 **Primary Actions** (Core Business Events):
${priorities.primary.map(p => `   - ${p}`).join('\n')}

🎯 **Secondary Actions** (Supporting Analytics):  
${priorities.secondary.map(s => `   - ${s}`).join('\n')}

🎯 **High-Value Business Events**:
${priorities.highValue.map(h => `   - ${h}`).join('\n')}`;
}

/**
 * Get all prompt templates for the crawler
 */
export function getPromptTemplates(
  objectives?: CrawlerObjectives,
  systemCustomization?: string
): PromptTemplates {
  return {
    systemPrompt: createSystemPrompt(systemCustomization),
    executionTemplate: EXECUTION_INSTRUCTION_TEMPLATE,
    businessObjectives: objectives || DEFAULT_ANALYTICS_OBJECTIVES
  };
}