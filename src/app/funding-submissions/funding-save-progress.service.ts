import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class FundingSaveProgressService {
  private readonly owners = new Set<number>();
  private nextToken = 0;
  private readonly activeSubject = new BehaviorSubject<boolean>(false);

  readonly active$: Observable<boolean> = this.activeSubject.asObservable();

  get active(): boolean {
    return this.owners.size > 0;
  }

  // Transient funding-save/loading status text is shown only when the build's environment file sets
  // FUNDING_SUBMISSIONS_SHOW_SAVE_PROGRESS to boolean true; administered app properties do not override it.
  get showProgressMessages(): boolean {
    return environment.FUNDING_SUBMISSIONS_SHOW_SAVE_PROGRESS === true;
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
