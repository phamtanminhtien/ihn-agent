import { Box, Text } from 'ink';

import { Markdown } from '../ui/markdown';

// ─────────────────────────────────────────────
// Thinking
// ─────────────────────────────────────────────
export const ThinkingBlock = ({ content }: { content: string }) => (
  <Box paddingLeft={2} marginBottom={1} flexDirection="column">
    <Text color="gray" italic>
      💭 Thinking...
    </Text>
    <Box paddingLeft={1}>
      <Markdown>{content}</Markdown>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncatePath(p: string, maxLen = 60): string {
  if (p.length <= maxLen) return p;
  return '…' + p.slice(-(maxLen - 1));
}

function formatToolName(name: string): string {
  const mapping: Record<string, string> = {
    read_file: 'Read File',
    write_file: 'Write File',
    edit_file: 'Edit File',
    list_dir: 'List Directory',
    run_command: 'Run Command',
    web_search: 'Web Search',
    grep_search: 'Search Code',
    task_complete: 'Task Complete',
  };

  if (mapping[name]) return mapping[name];

  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ToolHeader({
  name,
  provider,
  icon,
  color,
}: {
  name: string;
  provider?: string | undefined;
  icon: string;
  color: string;
}) {
  return (
    <Box flexDirection="row" gap={1} alignItems="center">
      <Text color={color} bold>
        {icon} {formatToolName(name)}
      </Text>
      {provider && (
        <Text color="gray" dimColor italic>
          ({provider})
        </Text>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────
// Per-tool Call Blocks
// ─────────────────────────────────────────────

/** read_file */
const ReadFileCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="cyan">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="📄" color="cyan" />
      <Text color="gray">·</Text>
      <Text color="white">{truncatePath(String(input.path ?? ''))}</Text>
    </Box>
    {input.encoding && input.encoding !== 'utf8' ? (
      <Text color="gray" dimColor>
        encoding: {String(input.encoding)}
      </Text>
    ) : null}
  </Box>
);

/** write_file */
const WriteFileCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="✏️" color="yellow" />
      <Text color="gray">·</Text>
      <Text color="white">{truncatePath(String(input.path ?? ''))}</Text>
    </Box>
    {input.overwrite !== undefined ? (
      <Text color="gray" dimColor>
        overwrite: {String(input.overwrite)}
      </Text>
    ) : null}
  </Box>
);

/** edit_file */
const EditFileCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => {
  const edits = Array.isArray(input.edits) ? input.edits : [];
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
      <Box flexDirection="row" gap={1}>
        <ToolHeader name={name} provider={provider} icon="🖊" color="yellow" />
        <Text color="gray">·</Text>
        <Text color="white">{truncatePath(String(input.path ?? ''))}</Text>
        <Text color="gray">
          ({edits.length} edit{edits.length !== 1 ? 's' : ''})
        </Text>
      </Box>
      {edits.slice(0, 3).map((e: unknown, i: number) => {
        const edit = e as { oldText?: string; newText?: string };
        const oldPreview =
          String(edit.oldText ?? '')
            .split('\n')[0]
            ?.slice(0, 40) ?? '';
        const newPreview =
          String(edit.newText ?? '')
            .split('\n')[0]
            ?.slice(0, 40) ?? '';
        return (
          <Box key={i} paddingLeft={1} flexDirection="row" gap={1}>
            <Text color="red" dimColor>
              -{oldPreview}
            </Text>
            <Text color="gray">→</Text>
            <Text color="green" dimColor>
              +{newPreview}
            </Text>
          </Box>
        );
      })}
      {edits.length > 3 ? (
        <Box paddingLeft={1}>
          <Text color="gray" dimColor>
            … and {edits.length - 3} more
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

/** list_dir */
const ListDirCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="blue">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="📁" color="blue" />
      <Text color="gray">·</Text>
      <Text color="white">{truncatePath(String(input.path ?? ''))}</Text>
      {input.recursive ? (
        <Text color="gray" dimColor>
          (recursive)
        </Text>
      ) : null}
    </Box>
  </Box>
);

/** run_command */
const RunCommandCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="magenta">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="💻" color="magenta" />
      {input.cwd ? (
        <>
          <Text color="gray">in</Text>
          <Text color="gray" dimColor>
            {truncatePath(String(input.cwd))}
          </Text>
        </>
      ) : null}
    </Box>
    <Box paddingLeft={1}>
      <Text color="white" bold>
        $ {String(input.command ?? '')}
      </Text>
    </Box>
  </Box>
);

/** web_search */
const WebSearchCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="cyan">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="🌐" color="cyan" />
      <Text color="gray">·</Text>
      <Text color="white">&quot;{String(input.query ?? '')}&quot;</Text>
    </Box>
  </Box>
);

/** grep_search */
const GrepSearchCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="blue">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="🔍" color="blue" />
      <Text color="gray">·</Text>
      <Text color="white">{String(input.query ?? '')}</Text>
    </Box>
    <Box paddingLeft={1} flexDirection="row" gap={1}>
      {input.path ? (
        <Text color="gray" dimColor>
          in {truncatePath(String(input.path))}
        </Text>
      ) : null}
      {input.include ? (
        <Text color="gray" dimColor>
          [{String(input.include)}]
        </Text>
      ) : null}
    </Box>
  </Box>
);

/** task_complete */
const TaskCompleteCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="green">
    <Box flexDirection="row" gap={1}>
      <ToolHeader name={name} provider={provider} icon="✅" color="green" />
    </Box>
    <Box paddingLeft={1}>
      <Text color="white" italic>
        {String(input.summary ?? '')}
      </Text>
    </Box>
  </Box>
);

/** Fallback generic call block */
const GenericCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: unknown;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
    <ToolHeader name={name} provider={provider} icon="🛠" color="yellow" />
    <Box paddingLeft={1}>
      <Markdown>{`\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``}</Markdown>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────
// Main ToolCallBlock dispatcher
// ─────────────────────────────────────────────
export const ToolCallBlock = ({
  name,
  input,
  provider,
}: {
  name: string;
  input: unknown;
  provider?: string | undefined;
}) => {
  const inp = (input ?? {}) as Record<string, unknown>;

  const inner = (() => {
    switch (name) {
      case 'read_file':
        return <ReadFileCallBlock name={name} input={inp} provider={provider} />;
      case 'write_file':
        return <WriteFileCallBlock name={name} input={inp} provider={provider} />;
      case 'edit_file':
        return <EditFileCallBlock name={name} input={inp} provider={provider} />;
      case 'list_dir':
        return <ListDirCallBlock name={name} input={inp} provider={provider} />;
      case 'run_command':
        return <RunCommandCallBlock name={name} input={inp} provider={provider} />;
      case 'web_search':
        return <WebSearchCallBlock name={name} input={inp} provider={provider} />;
      case 'grep_search':
        return <GrepSearchCallBlock name={name} input={inp} provider={provider} />;
      case 'task_complete':
        return <TaskCompleteCallBlock name={name} input={inp} provider={provider} />;
      default:
        return <GenericCallBlock name={name} input={inp} provider={provider} />;
    }
  })();

  return <Box marginBottom={1}>{inner}</Box>;
};

// ─────────────────────────────────────────────
// Per-tool Result Blocks
// ─────────────────────────────────────────────

/** read_file result → show file content */
const ReadFileResultBlock = ({
  name,
  output,
  provider,
}: {
  name: string;
  output: string;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Box flexDirection="row" gap={1}>
      <Text color="green" bold>
        ✅ {formatToolName(name)}
      </Text>
      {provider && (
        <Text color="gray" dimColor italic>
          ({provider})
        </Text>
      )}
      <Text color="green" bold>
        — {formatBytes(output.length)} read
      </Text>
    </Box>
    <Box paddingLeft={1}>
      <Markdown>{`\`\`\`\n${output.slice(0, 800)}${output.length > 800 ? '\n… (truncated)' : ''}\n\`\`\``}</Markdown>
    </Box>
  </Box>
);

/** write_file / edit_file result */
const FileWriteResultBlock = ({
  name,
  output,
  provider,
}: {
  name: string;
  output: Record<string, unknown>;
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="row" gap={1}>
    <Text color="green" bold>
      ✅ {formatToolName(name)}
    </Text>
    {provider && (
      <Text color="gray" dimColor italic>
        ({provider})
      </Text>
    )}
    <Text color="gray">→</Text>
    <Text color="white">{truncatePath(String(output.path ?? ''))}</Text>
  </Box>
);

/** list_dir result */
interface FileEntry {
  name: string;
  isDirectory: boolean;
  size?: number;
  path: string;
}

const ListDirResultBlock = ({
  name,
  output,
  provider,
}: {
  name: string;
  output: FileEntry[];
  provider?: string | undefined;
}) => {
  const items = Array.isArray(output) ? output : [];
  const shown = items.slice(0, 12);
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color="green" bold>
          ✅ {formatToolName(name)}
        </Text>
        {provider && (
          <Text color="gray" dimColor italic>
            ({provider})
          </Text>
        )}
        <Text color="green" bold>
          — {items.length} item{items.length !== 1 ? 's' : ''}
        </Text>
      </Box>
      {shown.map((entry, i) => (
        <Box key={i} paddingLeft={1} flexDirection="row" gap={1}>
          <Text color={entry.isDirectory ? 'blue' : 'white'}>
            {entry.isDirectory ? '📁' : '📄'}
          </Text>
          <Text color={entry.isDirectory ? 'blue' : 'white'}>{entry.name}</Text>
          {!entry.isDirectory && entry.size !== undefined ? (
            <Text color="gray" dimColor>
              ({formatBytes(entry.size)})
            </Text>
          ) : null}
        </Box>
      ))}
      {items.length > 12 ? (
        <Box paddingLeft={1}>
          <Text color="gray" dimColor>
            … and {items.length - 12} more
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

/** run_command result */
interface RunCommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const RunCommandResultBlock = ({
  name,
  output,
  isError,
  provider,
}: {
  name: string;
  output: RunCommandOutput;
  isError: boolean;
  provider?: string | undefined;
}) => {
  const ok = output.exitCode === 0 && !isError;
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text color={ok ? 'green' : 'red'} bold>
          {ok ? '✅' : '❌'} {formatToolName(name)}
        </Text>
        {provider && (
          <Text color="gray" dimColor italic>
            ({provider})
          </Text>
        )}
        <Text color="gray">exit {output.exitCode}</Text>
      </Box>
      {output.stdout ? (
        <Box paddingLeft={1} flexDirection="column">
          <Markdown>{`\`\`\`\n${output.stdout.slice(0, 600)}${output.stdout.length > 600 ? '\n…' : ''}\n\`\`\``}</Markdown>
        </Box>
      ) : null}
      {output.stderr ? (
        <Box paddingLeft={1} flexDirection="column">
          <Text color="red" dimColor>
            stderr:
          </Text>
          <Text color="red">{output.stderr.slice(0, 200)}</Text>
        </Box>
      ) : null}
    </Box>
  );
};

/** web_search result */
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const WebSearchResultBlock = ({
  name,
  output,
  provider,
}: {
  name: string;
  output: WebSearchResult[];
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Box flexDirection="row" gap={1}>
      <Text color="green" bold>
        ✅ {formatToolName(name)}
      </Text>
      {provider && (
        <Text color="gray" dimColor italic>
          ({provider})
        </Text>
      )}
      <Text color="green" bold>
        — {output.length} result{output.length !== 1 ? 's' : ''}
      </Text>
    </Box>
    {output.slice(0, 4).map((r, i) => (
      <Box key={i} paddingLeft={1} flexDirection="column">
        <Text color="cyan" bold>
          {r.title}
        </Text>
        <Text color="blue" dimColor>
          {r.url}
        </Text>
        <Text color="gray">{r.snippet.slice(0, 120)}</Text>
      </Box>
    ))}
    {output.length > 4 ? (
      <Box paddingLeft={1}>
        <Text color="gray" dimColor>
          … and {output.length - 4} more
        </Text>
      </Box>
    ) : null}
  </Box>
);

/** grep_search result */
interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

const GrepSearchResultBlock = ({
  name,
  output,
  provider,
}: {
  name: string;
  output: GrepMatch[];
  provider?: string | undefined;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Box flexDirection="row" gap={1}>
      <Text color="green" bold>
        ✅ {formatToolName(name)}
      </Text>
      {provider && (
        <Text color="gray" dimColor italic>
          ({provider})
        </Text>
      )}
      <Text color="green" bold>
        — {output.length} match{output.length !== 1 ? 'es' : ''}
      </Text>
    </Box>
    {output.slice(0, 8).map((m, i) => (
      <Box key={i} paddingLeft={1} flexDirection="row" gap={1}>
        <Text color="blue" dimColor>
          {truncatePath(m.file, 30)}:{m.line}
        </Text>
        <Text color="white">{m.content.slice(0, 60)}</Text>
      </Box>
    ))}
    {output.length > 8 ? (
      <Box paddingLeft={1}>
        <Text color="gray" dimColor>
          … and {output.length - 8} more
        </Text>
      </Box>
    ) : null}
  </Box>
);

/** task_complete result */
const TaskCompleteResultBlock = () => (
  <Box paddingX={1} paddingY={0} flexDirection="row" gap={1}>
    <Text color="green" bold>
      ✅ Task completed
    </Text>
  </Box>
);

/** Generic fallback result */
const GenericResultBlock = ({
  name,
  output,
  isError,
  provider,
}: {
  name: string;
  output: unknown;
  isError: boolean;
  provider?: string | undefined;
}) => {
  const displayOutput =
    typeof output === 'string'
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(output), null, 2);
          } catch {
            return output;
          }
        })()
      : JSON.stringify(output, null, 2);

  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color={isError ? 'red' : 'green'} bold>
          {isError ? '❌ Error' : '✅ Result'} from {formatToolName(name)}
        </Text>
        {provider && (
          <Text color="gray" dimColor italic>
            ({provider})
          </Text>
        )}
      </Box>
      <Box paddingLeft={1}>
        <Markdown>{`\`\`\`json\n${displayOutput}\n\`\`\``}</Markdown>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────
// Main ToolResultBlock dispatcher
// ─────────────────────────────────────────────
export const ToolResultBlock = ({
  name,
  output,
  isError = false,
  provider,
}: {
  name: string;
  output: unknown;
  isError?: boolean | undefined;
  provider?: string | undefined;
}) => {
  const inner = (() => {
    if (isError)
      return <GenericResultBlock name={name} output={output} isError provider={provider} />;

    const parseOutput = (raw: unknown) => {
      if (typeof raw !== 'string') return raw;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    };

    switch (name) {
      case 'read_file':
        return (
          <ReadFileResultBlock name={name} output={String(output ?? '')} provider={provider} />
        );
      case 'write_file':
      case 'edit_file':
        return (
          <FileWriteResultBlock
            name={name}
            output={(parseOutput(output) ?? {}) as Record<string, unknown>}
            provider={provider}
          />
        );
      case 'list_dir':
        return (
          <ListDirResultBlock
            name={name}
            output={(parseOutput(output) ?? []) as FileEntry[]}
            provider={provider}
          />
        );
      case 'run_command':
        return (
          <RunCommandResultBlock
            name={name}
            output={
              (parseOutput(output) ?? { stdout: '', stderr: '', exitCode: 0 }) as RunCommandOutput
            }
            isError={isError}
            provider={provider}
          />
        );
      case 'web_search':
        return (
          <WebSearchResultBlock
            name={name}
            output={(parseOutput(output) ?? []) as WebSearchResult[]}
            provider={provider}
          />
        );
      case 'grep_search':
        return (
          <GrepSearchResultBlock
            name={name}
            output={(parseOutput(output) ?? []) as GrepMatch[]}
            provider={provider}
          />
        );
      case 'task_complete':
        return <TaskCompleteResultBlock />;
      default:
        return (
          <GenericResultBlock name={name} output={output} isError={isError} provider={provider} />
        );
    }
  })();

  return <Box marginBottom={1}>{inner}</Box>;
};

// ─────────────────────────────────────────────
// Confirmation Block
// ─────────────────────────────────────────────
export const ConfirmationBlock = ({
  name,
  description,
  input,
  riskLevel,
  provider,
}: {
  name: string;
  description: string;
  input: unknown;
  riskLevel: string;
  provider?: string | undefined;
}) => {
  const riskColor = riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'yellow' : 'blue';

  return (
    <Box
      paddingLeft={2}
      marginBottom={1}
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
    >
      <Box flexDirection="row" marginBottom={1} gap={1} alignItems="center">
        <Text color="magenta" bold>
          ⚠️ Confirmation Required: {formatToolName(name)}
        </Text>
        {provider && (
          <Text color="gray" dimColor italic>
            ({provider})
          </Text>
        )}
        <Box marginLeft={2}>
          <Text color={riskColor} bold>
            [{riskLevel.toUpperCase()} RISK]
          </Text>
        </Box>
      </Box>

      {description ? (
        <Box marginBottom={1}>
          <Text italic color="gray">
            {description}
          </Text>
        </Box>
      ) : null}

      <Box paddingLeft={1} marginBottom={1}>
        <Markdown>{`\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``}</Markdown>
      </Box>

      <Box>
        <Text>Allow this tool to run? </Text>
        <Text bold color="green">
          [y]
        </Text>
        <Text>es / </Text>
        <Text bold color="red">
          [n]
        </Text>
        <Text>o</Text>
      </Box>
    </Box>
  );
};
