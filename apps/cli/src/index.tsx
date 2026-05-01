import { render } from 'ink';

import { App } from './app';
import { forceOnboarding, initialConfig, initialPrompt } from './cli/program';

render(
  <App
    initialConfig={initialConfig}
    initialPrompt={initialPrompt}
    forceOnboarding={forceOnboarding}
  />
);
