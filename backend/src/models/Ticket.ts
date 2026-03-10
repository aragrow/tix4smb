import mongoose, { Schema, Document, Types } from 'mongoose';
import { nextSequence } from './Counter';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type JobberEntityType = 'client' | 'job' | 'visit' | 'property' | 'vendor';
export type GHLEntityType = 'contact' | 'opportunity' | 'appointment';

export interface ITicket extends Document {
  ticket_number: number;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: Types.ObjectId;
  assigned_to?: Types.ObjectId;
  jobber_entity_type?: JobberEntityType;
  jobber_entity_id?: string;
  jobber_entity_label?: string;
  ghl_entity_type?: GHLEntityType;
  ghl_entity_id?: string;
  ghl_entity_label?: string;
  tags: string[];
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    ticket_number: { type: Number, unique: true, sparse: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: 'User' },
    jobber_entity_type: {
      type: String,
      enum: ['client', 'job', 'visit', 'property', 'vendor'],
    },
    jobber_entity_id: String,
    jobber_entity_label: { type: String, maxlength: 300 },
    ghl_entity_type: { type: String, enum: ['contact', 'opportunity', 'appointment'] },
    ghl_entity_id: String,
    ghl_entity_label: { type: String, maxlength: 300 },
    tags: [String],
    completed_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TicketSchema.index({ status: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ jobber_entity_id: 1 });
TicketSchema.index({ ghl_entity_id: 1 });
TicketSchema.index({ created_at: -1 });
TicketSchema.index({ ticket_number: 1 });

TicketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticket_number) {
    this.ticket_number = await nextSequence('ticket_number');
  }
  next();
});

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
