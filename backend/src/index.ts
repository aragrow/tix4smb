import './config/env'; // validate env vars early
import { app } from './app';
import { connectDB } from './db/mongoose';
import { loadTokens } from './services/jobberClient';
import { loadGHLConfig } from './services/ghlClient';
import { env } from './config/env';
import { Ticket } from './models/Ticket';

async function start(): Promise<void> {
  await connectDB();
  loadTokens();
  loadGHLConfig();

  // Backfill completed_at for existing closed tickets that don't have it
  const backfilled = await Ticket.updateMany(
    { status: 'closed', completed_at: { $exists: false } },
    { completed_at: new Date() }
  );
  if (backfilled.modifiedCount > 0) {
    console.log(`[Migration] Set completed_at on ${backfilled.modifiedCount} existing closed ticket(s)`);
  }
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
