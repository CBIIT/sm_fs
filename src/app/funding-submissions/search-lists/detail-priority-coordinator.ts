import { FundingSubmissionListDetailDto } from '@cbiit/i2efsws-lib';

export class DetailPriorityCoordinator {
  private readonly writes = new Map<number, Set<number>>();
  private readonly readbacks = new Map<number, number>();
  private readonly removals = new Set<number>();
  private readonly unavailableRecovery = new Set<number>();

  constructor(
    private readonly reconcile: (
      listId: number, applId: number, detail: FundingSubmissionListDetailDto, moved: boolean
    ) => void,
    private readonly onChange: (listId: number) => void
  ) {}

  hasPending(listId: number): boolean {
    return this.removals.has(listId) || this.unavailableRecovery.has(listId)
      || (this.writes.get(listId)?.size ?? 0) > 0;
  }

  isBlocked(listId: number, applId: number): boolean {
    return this.removals.has(listId) || this.unavailableRecovery.has(listId)
      || [...(this.writes.get(listId) ?? [])].some(writer => writer !== applId);
  }

  pendingWrites(listId: number): number[] {
    return [...(this.writes.get(listId) ?? [])];
  }

  isRecoveryUnavailable(listId: number): boolean {
    return this.unavailableRecovery.has(listId);
  }

  setRecoveryUnavailable(listId: number, unavailable: boolean): void {
    if (unavailable) {
      this.unavailableRecovery.add(listId);
    } else {
      this.unavailableRecovery.delete(listId);
    }
    this.onChange(listId);
  }

  beginWrite(listId: number, applId: number): boolean {
    if (this.hasPending(listId)) return false;
    this.trackRecovery(listId, applId);
    return true;
  }

  trackRecovery(listId: number, applId: number): void {
    const writers = this.writes.get(listId) ?? new Set<number>();
    writers.add(applId);
    this.writes.set(listId, writers);
    this.onChange(listId);
  }

  finishWrite(listId: number, applId: number): void {
    const writers = this.writes.get(listId);
    writers?.delete(applId);
    if (writers?.size === 0) this.writes.delete(listId);
    this.onChange(listId);
  }

  beginReadback(listId: number, applId: number): boolean {
    if (this.readbacks.has(listId)) return false;
    this.readbacks.set(listId, applId);
    return true;
  }

  endReadback(listId: number, applId: number): void {
    if (this.readbacks.get(listId) === applId) {
      this.readbacks.delete(listId);
    }
  }

  applyReadback(listId: number, applId: number, detail: FundingSubmissionListDetailDto, moved: boolean): void {
    this.reconcile(listId, applId, detail, moved);
  }

  beginRemoval(listId: number): boolean {
    if (this.hasPending(listId)) return false;
    this.removals.add(listId);
    this.onChange(listId);
    return true;
  }

  finishRemoval(listId: number): void {
    this.removals.delete(listId);
    this.onChange(listId);
  }
}
