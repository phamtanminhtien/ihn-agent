import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface Option {
  label: string;
  value: string;
}

interface SelectInputProps {
  label: string;
  options: Option[];
  onSelect: (value: string) => void;
}

export const SelectInput = ({ label, options, onSelect }: SelectInputProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_, key) => {
    if (options.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const selectedOption = options[selectedIndex];
      if (selectedOption) {
        onSelect(selectedOption.value);
      }
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>{label}</Text>
      <Box flexDirection="column" paddingLeft={1}>
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text color={index === selectedIndex ? 'cyan' : 'white'}>
              {index === selectedIndex ? '● ' : '○ '}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor italic>
        Use arrow keys to move, Enter to select.
      </Text>
    </Box>
  );
};
