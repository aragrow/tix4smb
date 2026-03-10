import mongoose, { Schema, Document, Types } from 'mongoose';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'sent';
export type JobberEntityType = 'client' | 'job' | 'visit' | 'property' | 'vendor';

export interface ITicketTask extends Document {
  ticket_ref: Types.ObjectId;
  description: string;
  status: TaskStatus;
  agent_generated: boolean;
  notes?: string;
  jobber_entity_type?: JobberEntityType;
  jobber_entity_id?: string;
  jobber_entity_label?: string;
  created_at: Date;
  updated_at: Date;
}

const TicketTaskSchema = new Schema<ITicketTask>(
  {
    ticket_ref: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    description: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'sent'],
      default: 'pending',
    },
    agent_generated: { type: Boolean, default: false },
    notes: { type: String, maxlength: 5000 },
    jobber_entity_type: {
      type: String,
      enum: ['client', 'job', 'visit', 'property', 'vendor'],
    },
    jobber_entity_id: String,
    jobber_entity_label: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TicketTask = mongoose.model<ITicketTask>('TicketTask', TicketTaskSchema);
