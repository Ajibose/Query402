import { PaymentRecord, StorageError, STORAGE_ERROR_CODES } from './types';

const VALID_VERSIONS = new Set([1]);
const REQUIRED_FIELDS = ['id', 'paymentReference', 'amount', 'timestamp', 'version', 'from', 'to'];

export function validatePaymentRecord(record: unknown): PaymentRecord {
  if (typeof record !== 'object' || record === null) {
    throw createValidationError('Record must be an object');
  }

  const paymentRecord = record as Record<string, unknown>;

  // Check all required fields exist
  for (const field of REQUIRED_FIELDS) {
    if (!(field in paymentRecord)) {
      throw createValidationError(`Missing required field: ${field}`);
    }
  }

  // Validate types and values
  if (typeof paymentRecord.id !== 'string' || paymentRecord.id.trim() === '') {
    throw createValidationError('id must be a non-empty string');
  }

  if (typeof paymentRecord.paymentReference !== 'string' || paymentRecord.paymentReference.trim() === '') {
    throw createValidationError('paymentReference must be a non-empty string');
  }

  if (typeof paymentRecord.amount !== 'number' || paymentRecord.amount < 0) {
    throw createValidationError('amount must be a non-negative number');
  }

  if (typeof paymentRecord.timestamp !== 'number' || paymentRecord.timestamp <= 0) {
    throw createValidationError('timestamp must be a positive number');
  }

  if (typeof paymentRecord.version !== 'number' || !VALID_VERSIONS.has(paymentRecord.version)) {
    throw createValidationError(`version must be one of: ${Array.from(VALID_VERSIONS).join(', ')}`);
  }

  if (typeof paymentRecord.from !== 'string' || paymentRecord.from.trim() === '') {
    throw createValidationError('from must be a non-empty string');
  }

  if (typeof paymentRecord.to !== 'string' || paymentRecord.to.trim() === '') {
    throw createValidationError('to must be a non-empty string');
  }

  return paymentRecord as PaymentRecord;
}

function createValidationError(message: string): StorageError {
  const error = new Error(message) as StorageError;
  error.code = STORAGE_ERROR_CODES.INVALID_RECORD;
  error.name = 'ValidationError';
  return error;
}

export function serializePaymentRecord(record: PaymentRecord): string {
  return JSON.stringify(record);
}

export function deserializePaymentRecord(serialized: string): PaymentRecord {
  const record = JSON.parse(serialized);
  return validatePaymentRecord(record);
}