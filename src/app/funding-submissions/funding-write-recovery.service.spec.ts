import { NGXLogger } from 'ngx-logger';

import { FundingWriteRecoveryService, isDefiniteFundingWriteRejection } from './funding-write-recovery.service';
import { MemoryStorage } from './testing/memory-storage';

describe('FundingWriteRecoveryService', () => {
  let storage: MemoryStorage;
  let logger: jasmine.SpyObj<NGXLogger>;
  let service: FundingWriteRecoveryService;

  beforeEach(() => {
    storage = new MemoryStorage();
    logger = jasmine.createSpyObj('NGXLogger', ['error']);
    service = new FundingWriteRecoveryService(storage, logger);
  });

  it('persists an unknown outcome before sending and holds it across service instances', () => {
    service.begin(1, 100);
    const otherInstance = new FundingWriteRecoveryService(storage, logger);
    expect(otherInstance.get(1, 100)?.state).toBe('unknown');
    expect(() => otherInstance.begin(1, 100)).toThrowError(/resolved/);
    expect(otherInstance.get(1, 200)).toBeNull();
    expect(otherInstance.get(2, 100)).toBeNull();
  });

  it('retains acknowledged and conflicted writes until explicit reconciliation', () => {
    service.begin(1, 100);
    service.mark(1, 100, 'saved');
    expect(service.get(1, 100)?.state).toBe('saved');
    service.begin(1, 200);
    service.mark(1, 200, 'conflict');
    expect(service.get(1, 200)?.state).toBe('conflict');
    service.clear(1, 100);
    expect(service.get(1, 100)).toBeNull();
    expect(service.get(1, 200)?.state).toBe('conflict');
  });

  it('fails closed when the recovery record is corrupt or storage cannot be written', () => {
    storage.setItem('fs.funding-submissions.write.1.100', '{bad');
    expect(() => service.get(1, 100)).toThrowError(/invalid/);
    spyOn(storage, 'setItem').and.throwError('Storage unavailable');
    expect(() => service.begin(1, 200)).toThrowError(/unavailable/);
    expect(logger.error).toHaveBeenCalled();
  });

  it('only treats documented client rejections as definitely not committed', () => {
    for (const status of [400, 401, 403, 404, 409]) {
      expect(isDefiniteFundingWriteRejection({ status })).withContext(String(status)).toBeTrue();
    }
    for (const error of [{ status: 0 }, { status: 500 }, new Error('cancelled'), null]) {
      expect(isDefiniteFundingWriteRejection(error)).toBeFalse();
    }
  });
});
