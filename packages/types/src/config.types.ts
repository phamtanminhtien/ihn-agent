export type ProviderName = 'anthropic' | 'openai' | 'gemini';
export type UITheme = 'dark' | 'light';

export interface AgentConfig {
  /**
   * LLM provider name
   * @default 'anthropic'
   */
  provider: ProviderName;

  /**
   * Model identifier (e.g. 'claude-3-5-sonnet-20240620')
   */
  model: string;

  /**
   * API key for the selected provider.
   * This should ideally be loaded from environment variables.
   */
  apiKey: string;

  /**
   * Optional base URL for the API (e.g. for proxy or self-hosted models)
   */
  baseUrl?: string | undefined;

  /**
   * Context window size cap (token limit)
   * @default 100000
   */
  maxContextTokens: number;

  /**
   * Maximum agent loop iterations (safety limit)
   * @default 50
   */
  maxTurns: number;

  /**
   * Skip confirmation prompts for tools that require it
   * @default false
   */
  autoApprove: boolean;

  /**
   * Shell commands that skip the approval gate
   * @default []
   */
  allowedCommands: string[];

  /**
   * Enable/disable streaming output
   * @default true
   */
  streamOutput: boolean;

  /**
   * UI theme
   * @default 'dark'
   */
  theme: UITheme;
}
