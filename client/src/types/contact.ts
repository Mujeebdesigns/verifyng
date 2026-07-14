export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageDetail extends ContactMessagePayload {
  id: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}
