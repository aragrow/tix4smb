import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INote extends Document {
  ticket_ref: Types.ObjectId;
  body: string;
  author?: Types.ObjectId;
  agent_generated: boolean;
  created_at: Date;
}

const NoteSchema = new Schema<INote>(
  {
    ticket_ref: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    body: { type: String, required: true, maxlength: 10000 },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    agent_generated: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const Note = mongoose.model<INote>('Note', NoteSchema);
