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

// ─────────────────────────────────────────────
// Per-tool Call Blocks
// ─────────────────────────────────────────────

/** read_file */
const ReadFileCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="cyan">
    <Box flexDirection="row" gap={1}>
      <Text color="cyan" bold>
        📄 {formatToolName(name)}
      </Text>
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
const WriteFileCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
    <Box flexDirection="row" gap={1}>
      <Text color="yellow" bold>
        ✏️ {formatToolName(name)}
      </Text>
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
const EditFileCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => {
  const edits = Array.isArray(input.edits) ? input.edits : [];
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
      <Box flexDirection="row" gap={1}>
        <Text color="yellow" bold>
          🖊 {formatToolName(name)}
        </Text>
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
const ListDirCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="blue">
    <Box flexDirection="row" gap={1}>
      <Text color="blue" bold>
        📁 {formatToolName(name)}
      </Text>
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
const RunCommandCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="magenta">
    <Box flexDirection="row" gap={1}>
      <Text color="magenta" bold>
        💻 {formatToolName(name)}
      </Text>
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
const WebSearchCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="cyan">
    <Box flexDirection="row" gap={1}>
      <Text color="cyan" bold>
        🌐 {formatToolName(name)}
      </Text>
      <Text color="gray">·</Text>
      <Text color="white">&quot;{String(input.query ?? '')}&quot;</Text>
    </Box>
  </Box>
);

/** grep_search */
const GrepSearchCallBlock = ({ name, input }: { name: string; input: Record<string, unknown> }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="blue">
    <Box flexDirection="row" gap={1}>
      <Text color="blue" bold>
        🔍 {formatToolName(name)}
      </Text>
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
}: {
  name: string;
  input: Record<string, unknown>;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="green">
    <Box flexDirection="row" gap={1}>
      <Text color="green" bold>
        ✅ {formatToolName(name)}
      </Text>
    </Box>
    <Box paddingLeft={1}>
      <Text color="white" italic>
        {String(input.summary ?? '')}
      </Text>
    </Box>
  </Box>
);

/** Fallback generic call block */
const GenericCallBlock = ({ name, input }: { name: string; input: unknown }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column" borderStyle="single" borderColor="yellow">
    <Text color="yellow" bold>
      🛠 {formatToolName(name)}
    </Text>
    <Box paddingLeft={1}>
      <Markdown>{`\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``}</Markdown>
    </Box>
  </Box>
);

// ─────────────────────────────────────────────
// Main ToolCallBlock dispatcher
// ─────────────────────────────────────────────
export const ToolCallBlock = ({ name, input }: { name: string; input: unknown }) => {
  const inp = (input ?? {}) as Record<string, unknown>;

  const inner = (() => {
    switch (name) {
      case 'read_file':
        return <ReadFileCallBlock name={name} input={inp} />;
      case 'write_file':
        return <WriteFileCallBlock name={name} input={inp} />;
      case 'edit_file':
        return <EditFileCallBlock name={name} input={inp} />;
      case 'list_dir':
        return <ListDirCallBlock name={name} input={inp} />;
      case 'run_command':
        return <RunCommandCallBlock name={name} input={inp} />;
      case 'web_search':
        return <WebSearchCallBlock name={name} input={inp} />;
      case 'grep_search':
        return <GrepSearchCallBlock name={name} input={inp} />;
      case 'task_complete':
        return <TaskCompleteCallBlock name={name} input={inp} />;
      default:
        return <GenericCallBlock name={name} input={inp} />;
    }
  })();

  return <Box marginBottom={1}>{inner}</Box>;
};

// ─────────────────────────────────────────────
// Per-tool Result Blocks
// ─────────────────────────────────────────────

/** read_file result → show file content */
const ReadFileResultBlock = ({ name, output }: { name: string; output: string }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Text color="green" bold>
      ✅ {formatToolName(name)} — {formatBytes(output.length)} read
    </Text>
    <Box paddingLeft={1}>
      <Markdown>{`\`\`\`\n${output.slice(0, 800)}${output.length > 800 ? '\n… (truncated)' : ''}\n\`\`\``}</Markdown>
    </Box>
  </Box>
);

/** write_file / edit_file result */
const FileWriteResultBlock = ({
  name,
  output,
}: {
  name: string;
  output: Record<string, unknown>;
}) => (
  <Box paddingX={1} paddingY={0} flexDirection="row" gap={1}>
    <Text color="green" bold>
      ✅ {formatToolName(name)}
    </Text>
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

const ListDirResultBlock = ({ name, output }: { name: string; output: FileEntry[] }) => {
  const items = Array.isArray(output) ? output : [];
  const shown = items.slice(0, 12);
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Text color="green" bold>
        ✅ {formatToolName(name)} — {items.length} item{items.length !== 1 ? 's' : ''}
      </Text>
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
}: {
  name: string;
  output: RunCommandOutput;
  isError: boolean;
}) => {
  const ok = output.exitCode === 0 && !isError;
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color={ok ? 'green' : 'red'} bold>
          {ok ? '✅' : '❌'} {formatToolName(name)}
        </Text>
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

const WebSearchResultBlock = ({ name, output }: { name: string; output: WebSearchResult[] }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Text color="green" bold>
      ✅ {formatToolName(name)} — {output.length} result{output.length !== 1 ? 's' : ''}
    </Text>
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

const GrepSearchResultBlock = ({ name, output }: { name: string; output: GrepMatch[] }) => (
  <Box paddingX={1} paddingY={0} flexDirection="column">
    <Text color="green" bold>
      ✅ {formatToolName(name)} — {output.length} match{output.length !== 1 ? 'es' : ''}
    </Text>
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
}: {
  name: string;
  output: unknown;
  isError: boolean;
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
      <Text color={isError ? 'red' : 'green'} bold>
        {isError ? '❌ Error' : '✅ Result'} from {formatToolName(name)}
      </Text>
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
}: {
  name: string;
  output: unknown;
  isError?: boolean | undefined;
}) => {
  const inner = (() => {
    if (isError) return <GenericResultBlock name={name} output={output} isError />;

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
        return <ReadFileResultBlock name={name} output={String(output ?? '')} />;
      case 'write_file':
      case 'edit_file':
        return (
          <FileWriteResultBlock
            name={name}
            output={(parseOutput(output) ?? {}) as Record<string, unknown>}
          />
        );
      case 'list_dir':
        return (
          <ListDirResultBlock name={name} output={(parseOutput(output) ?? []) as FileEntry[]} />
        );
      case 'run_command':
        return (
          <RunCommandResultBlock
            name={name}
            output={
              (parseOutput(output) ?? { stdout: '', stderr: '', exitCode: 0 }) as RunCommandOutput
            }
            isError={isError}
          />
        );
      case 'web_search':
        return (
          <WebSearchResultBlock
            name={name}
            output={(parseOutput(output) ?? []) as WebSearchResult[]}
          />
        );
      case 'grep_search':
        return (
          <GrepSearchResultBlock name={name} output={(parseOutput(output) ?? []) as GrepMatch[]} />
        );
      case 'task_complete':
        return <TaskCompleteResultBlock />;
      default:
        return <GenericResultBlock name={name} output={output} isError={isError} />;
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
}: {
  name: string;
  description: string;
  input: unknown;
  riskLevel: string;
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
      <Box flexDirection="row" marginBottom={1}>
        <Text color="magenta" bold>
          ⚠️ Confirmation Required: {formatToolName(name)}
        </Text>
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
