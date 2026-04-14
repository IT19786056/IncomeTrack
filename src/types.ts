export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  role: 'admin' | 'user';
  isInvited: boolean;
  createdAt: any;
}

export interface Invitation {
  id?: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: any;
}

export interface Expense {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  date: any;
  description: string;
  createdAt: any;
}

export interface Income {
  id?: string;
  userId: string;
  amount: number;
  source: string;
  date: any;
  description: string;
  createdAt: any;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  budget: number;
  icon?: string;
  color?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
