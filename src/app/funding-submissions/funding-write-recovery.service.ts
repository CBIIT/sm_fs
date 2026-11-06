import { Inject, Injectable, InjectionToken } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

export type FundingWriteRecoveryState = 'unknown' | 'saved' | 'conflict';

export interface FundingWriteRecoveryRecord {
  state: FundingWriteRecoveryState;
  startedAt: number;
}

export const FUNDING_WRITE_RECOVERY_STORAGE = new InjectionToken<Storage>('Funding write recovery storage', {
  providedIn: 'root',
  factory: () => window.localStorage
});

@Injectable({ providedIn: 'root' })
export class FundingWriteRecoveryService {
  private readonly keyPrefix = 'fs.funding-submissions.write.';

  constructor(
    @Inject(FUNDING_WRITE_RECOVERY_STORAGE) private storage: Storage,
    private logger: NGXLogger
  ) {}

  get(listId: number, applId: number): FundingWriteRecoveryRecord | null {
    let value: string | null;
    try {
      value = this.storage.getItem(this.key(listId, applId));
    } catch (error) {
      this.logger.error('Unable to read funding write recovery state', error);
      throw new Error('Funding save recovery is unavailable. No further save can be made safely.');
    }
    if (value === null) {
      return null;
    }

    let record: FundingWriteRecoveryRecord;
    try {
      record = JSON.parse(value);
    } catch (error) {
      this.logger.error('Invalid funding write recovery state', error);
      throw new Error('Funding save recovery state is invalid. Contact support before saving.');
    }
    if (!record || !['unknown', 'saved', 'conflict'].includes(record.state)
      || !Number.isFinite(record.startedAt)) {
      throw new Error('Funding save recovery state is invalid. Contact support before saving.');
    }
    return record;
  }

  begin(listId: number, applId: number): void {
    if (this.get(listId, applId)) {
      throw new Error('This grant has a previous save that must be resolved before saving again.');
    }
    this.write(listId, applId, { state: 'unknown', startedAt: Date.now() });
  }

  mark(listId: number, applId: number, state: 'saved' | 'conflict'): void {
    const record = this.get(listId, applId);
    if (!record) {
      throw new Error('Funding save recovery state is missing. Contact support before saving again.');
    }
    this.write(listId, applId, { ...record, state });
  }

  clear(listId: number, applId: number): void {
    try {
      this.storage.removeItem(this.key(listId, applId));
    } catch (error) {
      this.logger.error('Unable to clear funding write recovery state', error);
      throw new Error('Funding save recovery could not be cleared. Contact support before saving again.');
    }
  }

  private write(listId: number, applId: number, record: FundingWriteRecoveryRecord): void {
    try {
      this.storage.setItem(this.key(listId, applId), JSON.stringify(record));
    } catch (error) {
      this.logger.error('Unable to persist funding write recovery state', error);
      throw new Error('Funding save recovery is unavailable. No further save can be made safely.');
    }
  }

  private key(listId: number, applId: number): string {
    return `${this.keyPrefix}${listId}.${applId}`;
  }
}

export function isDefiniteFundingWriteRejection(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false;
  }
  return [400, 401, 403, 404, 409].includes(Number(error.status));
}
