import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-can-search-modal',
  templateUrl: './can-search-modal.component.html',
  styleUrls: ['./can-search-modal.component.css']
})
export class CanSearchModalComponent implements OnInit {
  @ViewChild('canSearchModal') private modalContent: TemplateRef<CanSearchModalComponent>;

  @Input() canData: CanCcxDto[];
  nciSourceFlag: string;
  title = 'CAN Search';
  searchTerm: string;

  constructor(
    private logger: NGXLogger,
    private modalService: NgbModal) {
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

  open(): void {
    const modalRef = this.modalService.open(this.modalContent, {size: 'lg'});
    this.logger.debug(modalRef.componentInstance);
    modalRef.result.then(result => {
      this.logger.debug(result);
    }).finally(() => {
      this.logger.debug('close dialog');
    });
  }
}
