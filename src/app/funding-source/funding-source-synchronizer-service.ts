import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FundingSourceSynchronizerService {
  fundingSourceSelectionEmitter = new Subject<number>();
  fundingSourceDeselectionEmitter = new Subject<number>();
}
