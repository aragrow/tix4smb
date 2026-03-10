import './config/env'; // validate env vars early
import { app } from './app';
import { connectDB } from './db/mongoose';
import { loadTokens } from './services/jobberClient';
import { loadGHLConfig } from './services/ghlClient';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDB();
  loadTokens();
  loadGHLConfig();
  const port = parseInt(env.PORT, 10);
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
  });
}

start().catch((err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
