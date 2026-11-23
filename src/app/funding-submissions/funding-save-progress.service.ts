import { Injectable } from '@angular/core';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { BehaviorSubject, Observable } from 'rxjs';

// Transient funding-save/loading status text is hidden unless this app property is exactly "true"
// (trimmed, case-insensitive). The default lives here, not in environment overrides, because
// AppPropertiesService prefers any truthy environment value over the administered app property.
export const SHOW_SAVE_PROGRESS_PROPERTY = 'FUNDING_SUBMISSIONS_SHOW_SAVE_PROGRESS';

@Injectable({ providedIn: 'root' })
export class FundingSaveProgressService {
  private readonly owners = new Set<number>();
  private nextToken = 0;
  private readonly activeSubject = new BehaviorSubject<boolean>(false);

  readonly active$: Observable<boolean> = this.activeSubject.asObservable();

  constructor(private propertiesService: AppPropertiesService) {}

  get active(): boolean {
    return this.owners.size > 0;
  }

  get showProgressMessages(): boolean {
    const value = this.propertiesService.getProperty(SHOW_SAVE_PROGRESS_PROPERTY);
    return String(value ?? '').trim().toLowerCase() === 'true';
  }

  begin(): number {
    const token = ++this.nextToken;
    this.owners.add(token);
    this.publish();
    return token;
  }

  end(token: number): void {
    if (this.owners.delete(token)) this.publish();
  }

  private publish(): void {
    if (this.activeSubject.value !== this.active) this.activeSubject.next(this.active);
  }
}
