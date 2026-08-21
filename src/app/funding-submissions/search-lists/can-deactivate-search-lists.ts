import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SearchListsComponent } from './search-lists.component';

@Injectable({ providedIn: 'root' })
export class CanDeactivateSearchLists implements CanDeactivate<SearchListsComponent> {
  canDeactivate(component: SearchListsComponent): boolean {
    return component.canDeactivate();
  }
}
