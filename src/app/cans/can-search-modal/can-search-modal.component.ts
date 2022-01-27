import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CanCcxDto, WorkflowTaskDto } from '@cbiit/i2ecws-lib';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CanManagementService } from '../can-management.service';
import { CustomServerLoggingService } from '../../logging/custom-server-logging-service';

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
  title = 'Search by CAN Information';
  canSearchTerm: string;

  constructor(
    private logger: CustomServerLoggingService,
    private modalService: NgbModal,
    private canManagementService: CanManagementService) {
  }

  ngOnInit(): void {
  }

  search(searchAll: boolean): void {
    if (!!this.bmmCodes && !!this.activityCodes) {
      if (searchAll) {
        this.logger.debug(`searching for term '${this.canSearchTerm}'`);
        if (this.canSearchTerm || confirm('Searching for all CANs with an empty search term will take a long time. Are you sure you wish to proceed?')) {
          this.canData = null;
          this.canManagementService.searchAllCans(this.canSearchTerm, this.bmmCodes, this.activityCodes, this.nciSourceFlag).subscribe(result => {
            this.canData = result;
          });
        }
      } else {
        this.canManagementService.searchDefaultCans(this.canSearchTerm, this.bmmCodes, this.activityCodes, this.nciSourceFlag).subscribe(result => {
          this.canData = result;
        });
      }
    }
  }

  reset(): void {
    this.canSearchTerm = '';
    this.search(false);
  }

  prepare(): void {
    this.reset();
  }

  onSubmit(canSearchForm: NgForm): void {
    this.logger.debug(canSearchForm);
  }

  open(): Promise<CanCcxDto> {
    return new Promise<CanCcxDto>((resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent, { size: 'lg', scrollable: true });
      this.modalRef.result.then(resolve, reject);
    });
  }

  // get showAll(): boolean {
  //   return this._showAll;
  // }
  //
  // set showAll(value: boolean) {
  //   if (!value) {
  //     this.search();
  //   } else {
  //     this.canData = null;
  //   }
  //   this._showAll = value;
  // }

  select($event: MouseEvent, c: CanCcxDto): void {
    $event.preventDefault();
    this.modalRef.close(c);

  }
}
