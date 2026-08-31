// Tipi per il server
import { Request } from 'express';
import { User } from '../shared/types';

// Estende il tipo Request di Express per includere user
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    warehouse: string;
  };
}

// Tipi per JWT payload
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  warehouse: string;
  warehouse_name?: string;
  language: string;
}