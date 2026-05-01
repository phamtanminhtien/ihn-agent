import { render } from 'ink';

import { App } from './app.js';
import { initialConfig, initialPrompt } from './cli/program.js';

render(<App initialConfig={initialConfig} initialPrompt={initialPrompt} />);
