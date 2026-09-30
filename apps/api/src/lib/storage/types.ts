export interface PaymentRecord {
  id: string;
  paymentReference: string;
  amount: number;
  timestamp: number;
  version: number;
  from: string;
  to: string;
}

export interface StorageError extends Error {
  code: string;
}

export const STORAGE_ERROR_CODES = {
  INVALID_RECORD: 'INVALID_RECORD',
  DUPLICATE_ID: 'DUPLICATE_ID',
  NOT_FOUND: 'NOT_FOUND'
} as const;

export type StorageErrorCode = typeof STORAGE_ERROR_CODES[keyof typeof STORAGE_ERROR_CODES];