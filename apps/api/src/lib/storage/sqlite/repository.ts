import { Database } from 'sqlite3';
import { PaymentRecord, StorageError, STORAGE_ERROR_CODES } from '../types';
import { validatePaymentRecord, serializePaymentRecord, deserializePaymentRecord } from '../serialization';

export class SqliteRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.initialize();
  }

  private initialize(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS payment_records (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )
      `);
    });
  }

  async insert(record: unknown): Promise<PaymentRecord> {
    try {
      const validatedRecord = validatePaymentRecord(record);
      const serialized = serializePaymentRecord(validatedRecord);

      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT INTO payment_records (id, data) VALUES (?, ?)',
          [validatedRecord.id, serialized],
          function (err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                const error = new Error(`Record with id ${validatedRecord.id} already exists`) as StorageError;
                error.code = STORAGE_ERROR_CODES.DUPLICATE_ID;
                error.name = 'DuplicateError';
                reject(error);
              } else {
                reject(err);
              }
            } else {
              resolve(validatedRecord);
            }
          }
        );
      });
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
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT data FROM payment_records WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            try {
              const record = deserializePaymentRecord(row.data);
              resolve(record);
            } catch (deserializeErr) {
              reject(deserializeErr);
            }
          }
        }
      );
    });
  }

  async list(): Promise<PaymentRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT data FROM payment_records',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            try {
              const records = rows.map((row: { data: string }) =>
                deserializePaymentRecord(row.data)
              );
              resolve(records);
            } catch (deserializeErr) {
              reject(deserializeErr);
            }
          }
        }
      );
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM payment_records', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

export function createSqliteRepository(db: Database): SqliteRepository {
  return new SqliteRepository(db);
}