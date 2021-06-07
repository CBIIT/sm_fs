import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FundingSourceSynchronizerService {
  // Used to communicate to interested parties what value was selected
  fundingSourceSelectionEmitter = new Subject<number>();
  // Used for filtering purposes - add these values to list of sources to be filtered out
  fundingSourceSelectionFilterEmitter = new Subject<number>();
  // Used for filtering purposes - remove these values from list of sources to be filtered out
  fundingSourceDeselectionEmitter = new Subject<number>();
  fundingSourceRestoreSelectionEmitter = new Subject<number>();
}
