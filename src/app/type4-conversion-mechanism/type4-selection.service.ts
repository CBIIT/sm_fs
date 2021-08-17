import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Type4SelectionService {
  Type4SelectionEmitter = new Subject<string>();
}
