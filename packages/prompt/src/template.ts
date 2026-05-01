import type { PromptVariables } from '@ihn-agent/types';

export class PromptTemplate {
  constructor(private readonly template: string) {}

  format(variables: PromptVariables): string {
    return this.template.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      if (value === undefined) {
        throw new Error(`Variable "${path}" is missing in prompt template`);
      }
      return String(value);
    });
  }

  partial(variables: PromptVariables): PromptTemplate {
    let newTemplate = this.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      newTemplate = newTemplate.replace(regex, String(value));
    }
    return new PromptTemplate(newTemplate);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  get raw(): string {
    return this.template;
  }
}
