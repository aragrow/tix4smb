import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'tix4smb' });
  console.log('✅ MongoDB connected: tix4smb');
}
