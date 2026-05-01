import { Box, Text, useInput } from 'ink';
import React from 'react';

interface TextInputProps {
  label: string;
  placeholder?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: ((value: string) => void) | undefined;
  mask?: boolean | undefined;
}

export const TextInput = ({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  mask = false,
}: TextInputProps) => {
  useInput((inputChar, key) => {
    if (key.return) {
      if (onSubmit) onSubmit(value);
    } else if (key.backspace || (key.delete && !key.ctrl && !key.meta)) {
      onChange(value.slice(0, -1));
    } else if (!key.ctrl && !key.meta) {
      onChange(value + inputChar);
    }
  });

  const displayValue = mask ? '*'.repeat(value.length) : value;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>{label}</Text>
      <Box paddingLeft={1}>
        <Text color="yellow">{'> '}</Text>
        {value.length === 0 && placeholder ? (
          <Text color="gray">{placeholder}</Text>
        ) : (
          <Text>{displayValue}</Text>
        )}
        <Text color="yellow">█</Text>
      </Box>
    </Box>
  );
};
