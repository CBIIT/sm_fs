import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CanCcxDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CanManagementService } from '../can-management.service';

@Component({
  selector: 'app-can-search-modal',
  templateUrl: './can-search-modal.component.html',
  styleUrls: ['./can-search-modal.component.css']
})
export class CanSearchModalComponent implements OnInit {
  @ViewChild('canSearchModal') private modalContent: TemplateRef<CanSearchModalComponent>;
  private modalRef: NgbModalRef;

  canData: CanCcxDto[];
  nciSourceFlag: string;
  bmmCodes: string;
  activityCodes: string;
  title = 'CAN Search';
  canSearchTerm: string;
  private _showAll: boolean;

  constructor(
    private logger: NGXLogger,
    private modalService: NgbModal,
    private canManagementService: CanManagementService) {
  }

  ngOnInit(): void {
    this.showAll = false;
  }

  search(): void {
    if (!!this.bmmCodes && !!this.activityCodes) {
      if (this.showAll) {
        this.canManagementService.searchAllCans(this.canSearchTerm, this.bmmCodes, this.activityCodes, this.nciSourceFlag).subscribe(result => {
          this.canData = result;
        });
      } else {
        this.canManagementService.searchDefaultCans(this.canSearchTerm, this.bmmCodes, this.activityCodes, this.nciSourceFlag).subscribe(result => {
          this.canData = result;
        });
      }
    }
  }

  reset(): void {
    this.canSearchTerm = '';
    this.showAll = false;
  }

  prepare(): void {
    this.reset();
    this.search();
  }

  onSubmit(canSearchForm: NgForm): void {
    this.logger.debug(canSearchForm);
  }

  open(): Promise<CanCcxDto> {
    return new Promise<CanCcxDto>((resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent, { size: 'lg' });
      this.modalRef.result.then(resolve, reject);
    });
  }

  get showAll(): boolean {
    return this._showAll;
  }

  set showAll(value: boolean) {
    this._showAll = value;

    this.search();
  }

  select($event: MouseEvent, c: CanCcxDto): void {
    $event.preventDefault();
    this.modalRef.close(c);

  }
}
