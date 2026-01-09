/**
 * Magic Keywords Feature
 *
 * Detects special keywords in prompts and activates enhanced behaviors:
 * - ultrawork/ulw: Maximum performance mode with parallel orchestration
 * - search/find: Maximized search effort
 * - analyze/investigate: Deep analysis mode
 */

import type { MagicKeyword, PluginConfig } from '../shared/types.js';

/**
 * Ultrawork mode enhancement
 * Activates maximum performance with parallel agent orchestration
 * ENHANCED: Stronger persistence language from oh-my-opencode
 */
const ultraworkEnhancement: MagicKeyword = {
  triggers: ['ultrawork', 'ulw', 'uw'],
  description: 'Activates maximum performance mode with parallel agent orchestration',
  action: (prompt: string) => {
    // Remove the trigger word and add enhancement instructions
    const cleanPrompt = removeTriggerWords(prompt, ['ultrawork', 'ulw', 'uw']);

    return `[ULTRAWORK MODE ACTIVATED - THE BOULDER NEVER STOPS]

${cleanPrompt}

## THE ULTRAWORK OATH

You are now operating at MAXIMUM INTENSITY. Half-measures are unacceptable. Incomplete work is FAILURE. You will persist until EVERY task is VERIFIED complete.

## Execution Protocol

### 1. PARALLEL EVERYTHING
- Fire off MULTIPLE agents simultaneously for independent tasks
- Don't wait when you can parallelize
- Use background execution for ALL long-running operations

### 2. DELEGATE AGGRESSIVELY
Route to specialists IMMEDIATELY:
- \`oracle\` → Complex debugging, architecture, root cause
- \`librarian\` → Documentation research, codebase understanding
- \`explore\` → Fast pattern matching, file searches
- \`frontend-engineer\` → UI/UX, components, styling
- \`document-writer\` → README, API docs, technical writing
- \`multimodal-looker\` → Screenshot/diagram analysis

### 3. PERSISTENCE ENFORCEMENT
- Create TODO list FIRST with TodoWrite
- Mark in_progress BEFORE starting
- Mark completed ONLY after VERIFICATION
- LOOP until 100% complete
- Re-check todo list before ANY conclusion attempt

## THE COMPLETION GATE

Before stopping, VERIFY ALL:
- [ ] Todo list: ZERO pending/in_progress tasks
- [ ] All functionality: TESTED and WORKING
- [ ] All errors: RESOLVED
- [ ] User's request: FULLY SATISFIED

If ANY checkbox is unchecked, CONTINUE WORKING. No exceptions.

**CRITICAL: The boulder does not stop until it reaches the summit.**`;
  }
};

/**
 * Search mode enhancement
 * Maximizes search effort and thoroughness
 */
const searchEnhancement: MagicKeyword = {
  triggers: ['search', 'find', 'locate'],
  description: 'Maximizes search effort and thoroughness',
  action: (prompt: string) => {
    // Check if search-related triggers are present as commands
    const hasSearchCommand = /\b(search|find|locate)\b/i.test(prompt);

    if (!hasSearchCommand) {
      return prompt;
    }

    return `${prompt}

## Search Enhancement Instructions
- Use multiple search strategies (glob patterns, grep, AST search)
- Search across ALL relevant file types
- Include hidden files and directories when appropriate
- Try alternative naming conventions (camelCase, snake_case, kebab-case)
- Look in common locations: src/, lib/, utils/, helpers/, services/
- Check for related files (tests, types, interfaces)
- Report ALL findings, not just the first match
- If initial search fails, try broader patterns`;
  }
};

/**
 * Analyze mode enhancement
 * Activates deep analysis and investigation mode
 */
const analyzeEnhancement: MagicKeyword = {
  triggers: ['analyze', 'investigate', 'examine', 'debug'],
  description: 'Activates deep analysis and investigation mode',
  action: (prompt: string) => {
    // Check if analysis-related triggers are present
    const hasAnalyzeCommand = /\b(analyze|investigate|examine|debug)\b/i.test(prompt);

    if (!hasAnalyzeCommand) {
      return prompt;
    }

    return `${prompt}

## Deep Analysis Instructions
- Thoroughly examine all relevant code paths
- Trace data flow from source to destination
- Identify edge cases and potential failure modes
- Check for related issues in similar code patterns
- Use LSP tools for type information and references
- Use AST tools for structural code analysis
- Document findings with specific file:line references
- Propose concrete solutions with code examples
- Consider performance, security, and maintainability implications`;
  }
};

/**
 * Ultrathink mode enhancement
 * Activates extended thinking and deep reasoning
 */
const ultrathinkEnhancement: MagicKeyword = {
  triggers: ['ultrathink', 'think', 'reason', 'ponder'],
  description: 'Activates extended thinking mode for deep reasoning',
  action: (prompt: string) => {
    // Check if ultrathink-related triggers are present
    const hasThinkCommand = /\b(ultrathink|think|reason|ponder)\b/i.test(prompt);

    if (!hasThinkCommand) {
      return prompt;
    }

    const cleanPrompt = removeTriggerWords(prompt, ['ultrathink', 'think', 'reason', 'ponder']);

    return `[ULTRATHINK MODE - EXTENDED REASONING ACTIVATED]

${cleanPrompt}

## Deep Thinking Instructions
- Take your time to think through this problem thoroughly
- Consider multiple approaches before settling on a solution
- Identify edge cases, risks, and potential issues
- Think step-by-step through complex logic
- Question your assumptions
- Consider what could go wrong
- Evaluate trade-offs between different solutions
- Look for patterns from similar problems

IMPORTANT: Do not rush. Quality of reasoning matters more than speed.
Use maximum cognitive effort before responding.`;
  }
};

/**
 * Remove trigger words from a prompt
 */
function removeTriggerWords(prompt: string, triggers: string[]): string {
  let result = prompt;
  for (const trigger of triggers) {
    const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
    result = result.replace(regex, '');
  }
  return result.trim();
}

/**
 * All built-in magic keyword definitions
 */
export const builtInMagicKeywords: MagicKeyword[] = [
  ultraworkEnhancement,
  searchEnhancement,
  analyzeEnhancement,
  ultrathinkEnhancement
];

/**
 * Create a magic keyword processor with custom triggers
 */
export function createMagicKeywordProcessor(config?: PluginConfig['magicKeywords']): (prompt: string) => string {
  const keywords = [...builtInMagicKeywords];

  // Override triggers from config
  if (config) {
    if (config.ultrawork) {
      const ultrawork = keywords.find(k => k.triggers.includes('ultrawork'));
      if (ultrawork) {
        ultrawork.triggers = config.ultrawork;
      }
    }
    if (config.search) {
      const search = keywords.find(k => k.triggers.includes('search'));
      if (search) {
        search.triggers = config.search;
      }
    }
    if (config.analyze) {
      const analyze = keywords.find(k => k.triggers.includes('analyze'));
      if (analyze) {
        analyze.triggers = config.analyze;
      }
    }
    if (config.ultrathink) {
      const ultrathink = keywords.find(k => k.triggers.includes('ultrathink'));
      if (ultrathink) {
        ultrathink.triggers = config.ultrathink;
      }
    }
  }

  return (prompt: string): string => {
    let result = prompt;

    for (const keyword of keywords) {
      const hasKeyword = keyword.triggers.some(trigger => {
        const regex = new RegExp(`\\b${trigger}\\b`, 'i');
        return regex.test(result);
      });

      if (hasKeyword) {
        result = keyword.action(result);
      }
    }

    return result;
  };
}

/**
 * Check if a prompt contains any magic keywords
 */
export function detectMagicKeywords(prompt: string, config?: PluginConfig['magicKeywords']): string[] {
  const detected: string[] = [];
  const keywords = [...builtInMagicKeywords];

  // Apply config overrides
  if (config) {
    if (config.ultrawork) {
      const ultrawork = keywords.find(k => k.triggers.includes('ultrawork'));
      if (ultrawork) ultrawork.triggers = config.ultrawork;
    }
    if (config.search) {
      const search = keywords.find(k => k.triggers.includes('search'));
      if (search) search.triggers = config.search;
    }
    if (config.analyze) {
      const analyze = keywords.find(k => k.triggers.includes('analyze'));
      if (analyze) analyze.triggers = config.analyze;
    }
    if (config.ultrathink) {
      const ultrathink = keywords.find(k => k.triggers.includes('ultrathink'));
      if (ultrathink) ultrathink.triggers = config.ultrathink;
    }
  }

  for (const keyword of keywords) {
    for (const trigger of keyword.triggers) {
      const regex = new RegExp(`\\b${trigger}\\b`, 'i');
      if (regex.test(prompt)) {
        detected.push(trigger);
        break;
      }
    }
  }

  return detected;
}
