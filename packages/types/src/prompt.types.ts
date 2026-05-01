export type PromptVariables = Record<string, unknown>;

export interface PromptBlock {
  name: string;
  template: string;
  description?: string;
}

export interface EnvironmentSnapshot {
  os: string;
  platform: string;
  arch: string;
  cwd: string;
  timestamp: string;
  nodeVersion: string;
}

/**
 * Interface for a service that can compose a prompt string from variables.
 */
export interface IPromptComposer {
  compose(variables: PromptVariables): Promise<string>;
}
