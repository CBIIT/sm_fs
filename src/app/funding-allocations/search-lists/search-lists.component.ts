import { Component, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-search-lists',
  templateUrl: './search-lists.component.html',
  styleUrls: ['./search-lists.component.css']
})
export class SearchListsComponent implements OnInit {

  constructor(private logger: NGXLogger) {}

  ngOnInit(): void {
    this.logger.debug('SearchListsComponent initialized');
  }
}
