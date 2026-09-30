import { PaymentRecord, StorageError, STORAGE_ERROR_CODES } from './types';
import { validatePaymentRecord } from './serialization';

export class MemoryStore {
  private records: Map<string, PaymentRecord> = new Map();

  async insert(record: unknown): Promise<PaymentRecord> {
    try {
      const validatedRecord = validatePaymentRecord(record);
      if (this.records.has(validatedRecord.id)) {
        const error = new Error(`Record with id ${validatedRecord.id} already exists`) as StorageError;
        error.code = STORAGE_ERROR_CODES.DUPLICATE_ID;
        error.name = 'DuplicateError';
        throw error;
      }
      this.records.set(validatedRecord.id, validatedRecord);
      return validatedRecord;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      const validationError = new Error('Invalid payment record') as StorageError;
      validationError.code = STORAGE_ERROR_CODES.INVALID_RECORD;
      validationError.name = 'ValidationError';
      throw validationError;
    }
  }

  async get(id: string): Promise<PaymentRecord | null> {
    return this.records.get(id) || null;
  }

  async list(): Promise<PaymentRecord[]> {
    return Array.from(this.records.values());
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}

export function createMemoryStore(): MemoryStore {
  return new MemoryStore();
}