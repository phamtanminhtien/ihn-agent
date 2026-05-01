import { highlight } from 'cli-highlight';
import { Box, Text } from 'ink';
import { lexer, type Token, type Tokens } from 'marked';
import React from 'react';

interface MarkdownProps {
  children: string;
}

const TokenRenderer = ({ token }: { token: Token }) => {
  switch (token.type) {
    case 'heading':
      return (
        <Box marginBottom={1} marginTop={1}>
          <Text bold color="cyan">
            {'#'.repeat((token as Tokens.Heading).depth)} {(token as Tokens.Heading).text}
          </Text>
        </Box>
      );

    case 'paragraph':
      return (
        <Box marginBottom={1} flexDirection="row" flexWrap="wrap">
          <InlineRenderer tokens={(token as Tokens.Paragraph).tokens} />
        </Box>
      );

    case 'list': {
      const listToken = token as Tokens.List;
      return (
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          {listToken.items.map((item, index) => (
            <Box key={index} flexDirection="row">
              <Text color="yellow">{listToken.ordered ? `${index + 1}. ` : '• '}</Text>
              <Box flexDirection="column">
                <InlineRenderer tokens={item.tokens} />
              </Box>
            </Box>
          ))}
        </Box>
      );
    }

    case 'code': {
      const codeToken = token as Tokens.Code;
      let highlightedCode = codeToken.text;
      try {
        highlightedCode = highlight(codeToken.text, {
          ...(codeToken.lang && { language: codeToken.lang }),
        });
      } catch (e) {
        // Fallback to plain text if language is not supported or highlight fails
      }

      return (
        <Box
          flexDirection="column"
          paddingX={1}
          paddingY={0}
          marginBottom={1}
          borderStyle="round"
          borderColor="gray"
        >
          <Text>{highlightedCode}</Text>
        </Box>
      );
    }

    case 'blockquote':
      return (
        <Box
          flexDirection="column"
          paddingLeft={1}
          marginBottom={1}
          borderStyle="single"
          borderColor="blue"
        >
          <InlineRenderer tokens={(token as Tokens.Blockquote).tokens} />
        </Box>
      );

    case 'hr':
      return (
        <Box marginBottom={1}>
          <Text color="gray">{'─'.repeat(40)}</Text>
        </Box>
      );

    case 'space':
      return null;

    default:
      if ('tokens' in token && token.tokens) {
        return <InlineRenderer tokens={token.tokens} />;
      }
      return <Text>{'raw' in token ? token.raw : ''}</Text>;
  }
};

const InlineRenderer = ({ tokens }: { tokens: Token[] | undefined }) => {
  if (!tokens) return null;

  return (
    <>
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'strong':
            return (
              <Text key={index} bold>
                <InlineRenderer tokens={(token as Tokens.Strong).tokens} />
              </Text>
            );
          case 'em':
            return (
              <Text key={index} italic>
                <InlineRenderer tokens={(token as Tokens.Em).tokens} />
              </Text>
            );
          case 'codespan': {
            let highlighted = (token as Tokens.Codespan).text;
            try {
              highlighted = highlight(highlighted);
            } catch (e) {
              console.error(e);
            }
            return (
              <Text key={index} color="yellow" backgroundColor="gray">
                {` ${highlighted} `}
              </Text>
            );
          }
          case 'link':
            return (
              <Text key={index} color="blue" underline>
                {(token as Tokens.Link).text}
              </Text>
            );
          case 'br':
            return <Text key={index}>{'\n'}</Text>;
          case 'text':
            if ('tokens' in token && token.tokens) {
              return <InlineRenderer key={index} tokens={token.tokens} />;
            }
            return <Text key={index}>{(token as Tokens.Text).text}</Text>;
          default:
            return <Text key={index}>{'raw' in token ? token.raw : ''}</Text>;
        }
      })}
    </>
  );
};

export const Markdown = ({ children }: MarkdownProps) => {
  const tokens = lexer(children);

  return (
    <Box flexDirection="column">
      {tokens.map((token, index) => (
        <TokenRenderer key={index} token={token} />
      ))}
    </Box>
  );
};
