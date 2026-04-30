import type { Tool, ToolContext, ToolMetadata } from '@ihn-agent/types';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export abstract class BaseTool<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TOutput = unknown,
> implements Tool<z.infer<TSchema>, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract schema: TSchema;
  abstract metadata: ToolMetadata;

  get inputSchema(): unknown {
    return zodToJsonSchema(this.schema);
  }

  abstract execute(input: z.infer<TSchema>, ctx: ToolContext): Promise<TOutput>;

  /**
   * Validates the input against the schema before execution.
   * This can be called by the dispatcher.
   */
  validate(input: unknown): z.infer<TSchema> {
    return this.schema.parse(input);
  }
}
