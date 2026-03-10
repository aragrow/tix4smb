import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: Date;
  last_login_at: Date;
}

const UserSchema = new Schema<IUser>({
  google_id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar_url: String,
  created_at: { type: Date, default: Date.now },
  last_login_at: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
