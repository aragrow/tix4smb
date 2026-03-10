export interface User {
  _id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  last_login_at: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type JobberEntityType = 'client' | 'job' | 'visit' | 'property' | 'vendor';
export type GHLEntityType = 'contact' | 'opportunity' | 'appointment';

export interface Ticket {
  _id: string;
  ticket_number: number;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: Pick<User, '_id' | 'name' | 'avatar_url'>;
  assigned_to?: Pick<User, '_id' | 'name' | 'avatar_url'>;
  jobber_entity_type?: JobberEntityType;
  jobber_entity_id?: string;
  jobber_entity_label?: string;
  ghl_entity_type?: GHLEntityType;
  ghl_entity_id?: string;
  ghl_entity_label?: string;
  tags: string[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  _id: string;
  ticket_ref: string;
  body: string;
  author?: Pick<User, '_id' | 'name' | 'avatar_url'>;
  agent_generated?: boolean;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'sent';

export interface TicketTask {
  _id: string;
  ticket_ref: string;
  description: string;
  status: TaskStatus;
  agent_generated?: boolean;
  notes?: string;
  jobber_entity_type?: JobberEntityType;
  jobber_entity_id?: string;
  jobber_entity_label?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
}

export interface JobberClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

export interface JobberVendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
}

export interface JobberProperty {
  id: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  client: { id: string; name: string };
}

export interface JobberJob {
  id: string;
  title: string;
  jobStatus: string;
  client?: { id: string; name: string };
  property?: { id: string; street: string; city: string };
  vendor?: { id: string; name: string };
}

export interface JobberVisit {
  id: string;
  title: string;
  scheduledStart: string;
  status: 'scheduled' | 'completed' | 'unscheduled';
  client: { id: string; name: string };
  property: { id: string; street: string; city: string };
  vendor?: { id: string; name: string };
}

export interface GHLContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export interface GHLOpportunity {
  id: string;
  name: string;
  contact?: { id: string; name: string };
  pipelineStage?: string;
  monetaryValue?: number;
}

export interface GHLAppointment {
  id: string;
  title: string;
  contact?: { id: string; name: string };
  startTime: string;
  status?: string;
  address?: string;
}
