import { Component, Input, OnInit } from '@angular/core';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-can-search-modal',
  templateUrl: './can-search-modal.component.html',
  styleUrls: ['./can-search-modal.component.css']
})
export class CanSearchModalComponent implements OnInit {
  @Input() canData: CanCcxDto[];
  nciSourceFlag: string;
  title = 'CAN Search';
  searchTerm: string;

  constructor(
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('onInit');
  }

  search(): void {

  }

  reset(): void {

  }

  onSubmit(canSearchForm: NgForm): void {
    this.logger.debug(canSearchForm);
  }
}
