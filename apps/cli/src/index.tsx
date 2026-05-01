import { render } from 'ink';

import { App } from './app';
import { initialConfig, initialPrompt } from './cli/program';

render(<App initialConfig={initialConfig} initialPrompt={initialPrompt} />);
