import { createApp } from './http/app.js';
import { getPort } from './config.js';

const port = getPort();
const server = createApp();

server.listen(port, () => {
  console.log(`Event Ticketing server listening on port ${port}`);
});

server.on('error', (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exitCode = 1;
});