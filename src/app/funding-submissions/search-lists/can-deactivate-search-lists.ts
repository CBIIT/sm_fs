import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { SearchListsComponent } from './search-lists.component';

@Injectable({ providedIn: 'root' })
export class CanDeactivateSearchLists implements CanDeactivate<SearchListsComponent> {
  canDeactivate(component: SearchListsComponent): boolean | Observable<boolean> | Promise<boolean> {
    return component.canDeactivate();
  }
}
