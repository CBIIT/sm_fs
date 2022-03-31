import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CanManagementService } from '../can-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto } from '@cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { RequestModel } from '../../model/request/request-model';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {
  @ViewChild('canForm', { static: false }) canForm: NgForm;
  @Input() applId: number;
  @Input() fseId: number;
  @Input() bmmCodes: string;
  @Input() activityCodes: string;
  @Input() selectedValue: string;
  selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  data: Array<Select2OptionData>;

  @Input() index = 0;
  @Input() nciSourceFlag = '';
  @Input() readonly = false;
  @Input() canRequired = false;


  private loadSelectedCanDetails(canNumber: string): void {
    if (!canNumber) {
      return;
    }
    this.canService.getCanDetails(canNumber).subscribe(result => {
      this.selectedCanData = result;
      // this.logger.debug('new selected CAN', this.selectedCanData);
    });
  }

  constructor(private canService: CanManagementService,
              private logger: NGXLogger,
              private model: RequestModel) {
  }

  ngOnInit(): void {
    this.logger.debug('selected value', this.selectedValue);
    this.loadSelectedCanDetails(this.selectedValue);
    if (!this.bmmCodes) {
      this.bmmCodes = this.model.requestDto?.bmmCode;
    }
    if (!this.activityCodes) {
      this.activityCodes = this.model.requestDto?.activityCode;
    }

    this.initializeDefaultCans(this.selectedValue);

    if (!this.readonly) {
      this.canService.projectedCanEmitter.subscribe(next => {
        if (Number(next.index) === Number(this.index)) {
          // this.logger.debug('gotProjectedCan', next.can);
          this.updateProjectedCan(next.can);
        }
      });
    }
    this.canService.selectCANEmitter.subscribe(next => {
      if (Number(next.fseId) === Number(this.fseId)) {
        this.handleNewCAN(next.can);
      }
    });
  }

  private handleNewCAN(can: CanCcxDto): void {
    this.loadSelectedCanDetails(can.can);
    this.initializeDefaultCans(can.can);

    this.selectedValue = can.can;
  }

  private initializeDefaultCans(extraCan: string): void {
    this.logger.info(`initializeDefaultCans(${extraCan}, ${this.nciSourceFlag})`);
    this.canService.getDefaultCansWithExtra(this.nciSourceFlag, extraCan || null).subscribe(result => {
      this.defaultCans = result;
      this.data = new Array<Select2OptionData>();
      result.forEach(r => {
        this.data.push({ id: r.can, text: r.can + ' | ' + r.canDescrip, additional: r });
      });
    });
  }

  selectProjectedCan(): boolean {
    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      const tmp = this.data.filter(e => e.id === this.projectedCan.can);
      if (!tmp || tmp.length === 0) {
        this.data.push({
          id: this.projectedCan.can,
          text: this.projectedCan.can + ' | ' + this.projectedCan.canDescrip,
          additional: this.projectedCan
        });
      }
      this.selectedValue = this.projectedCan.can;
      this.loadSelectedCanDetails(this.selectedValue);

      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    if (this.projectedCan?.can === can.can) {
      return;
    }
    if (this.projectedCan && this.selectedValue && this.projectedCan.can === this.selectedValue) {
      // this.logger.debug('updateProjectedCan', can, this.selectedValue);
      this.selectedValue = null;
    }
    this.projectedCan = can;
  }

  onModelChange(): void {
    // this.logger.debug('onModelChange()', this.fseId, this.selectedValue);
    this.canService.checkDefaultCANs(this.fseId, -1, this.activityCodes, this.bmmCodes, this.nciSourceFlag, this.selectedValue);
    if (this.selectedValue) {
      this.loadSelectedCanDetails(this.selectedValue);
    } else {
      this.selectedCanData = null;
    }
  }
}
