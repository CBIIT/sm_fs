import { Component, OnInit } from '@angular/core';
import { Options } from 'select2';
import {Select2OptionData} from "ng-select2";
import {FsPlanControllerService, FundingPlanRfaPaDto} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from "ngx-logger";
import {FundingPlanNcabDto} from "@nci-cbiit/i2ecws-lib/model/fundingPlanNcabDto";

class NcabError {
  constructor(planId: number, ncab: string) {
    this.planId = planId;
    this.ncab = ncab;
  }
  planId: number;
  ncab: string;
}

/**
 * Data representation of each row for Rfa Pa dropdown and NCAB dates dropdown
 */
class RfaPaEntry {
  selectedNcabDates: string[] | string = [];
  rfaPaNumber: string = '';
  availableNcabDates: Array<Select2OptionData> = [];
  parent: FundingPlanGrantsSearchCriteria;
  ncabErrors: Array<NcabError> = [];
  rfaErrDuplcated: boolean = false;
  rfaErrRequired: boolean = false;
  ncabErrRequired: boolean = false;

  constructor(parent: FundingPlanGrantsSearchCriteria) {
    // The callback comes from the parent FundingPlanGrantsSearchCriteria instance to update
    // a list of available NCAB dates when Rfa Pa selection changed
    this.parent = parent;
    this.selectedNcabDates = [];
    this.availableNcabDates = [];
    this.rfaPaNumber = '';
  }

  onRfaPaChangeSelection($event: string | string[]): void {
    const id = this._getIndex();
    console.log('On Change Selection value: ', $event)
    console.log('On Change Selection id: ', id);
    const rfapa: string = ($event instanceof Array) ? $event[0] : $event;
    this.parent.onChangeRfaPaEntry(rfapa, id);
  }

  _getIndex(): number {
    for (let i = 0; i < this.parent.rfaPaEntries.length; i++) {
      if (this === this.parent.rfaPaEntries[i]) {
        return i;
      }
    }
    return -1;
  }

  onNcabChangeSelection($event: string | string[]) {
    console.log('On Change NCAB Selection value: ', $event)
    // validation
    this.ncabErrors = [];
    if ($event instanceof Array) {
      for (let ncab of $event) {
        let dto: FundingPlanNcabDto = this._findNcabDto(ncab);
        if (dto != null
            && dto.currentPlanStatus != null
            && dto.currentPlanStatus != 'COMPLETED'
            && dto.currentPlanStatus != 'REJECTED'
            && dto.currentPlanStatus != 'CANCELLED') {
          this.ncabErrors.push(new NcabError(dto.fprId, dto.formattedCouncilMeetingDate));
        }
      }
    }
    // reset 'ncab required' error
    const id = this._getIndex();
    this.parent.rfaPaEntries[id].ncabErrRequired = false;
  }

  _findNcabDto(ncab: string): FundingPlanNcabDto {
    for (let entry of this.availableNcabDates) {
      if (entry.additional.councilMeetingDate === ncab) {
        return entry.additional;
      }
    }
    return null;
  }
}

/**
 * Data representation of search criteria view.
 */
class FundingPlanGrantsSearchCriteria {
  rfaPaEntries: Array<RfaPaEntry> = [];
  ncabMap: Map<string, Array<Select2OptionData>>;
  activityCodesMap: Map<string, string>;
  availableRfaPas: Array<Select2OptionData> = [];
  errActivityCodes: Array<string> = [];

  constructor() {
    this.ncabMap = new Map<string, Array<Select2OptionData>>();
    this.activityCodesMap = new Map<string, string>();
    this.rfaPaEntries.push(new RfaPaEntry(this))
  }

  public onChangeRfaPaEntry(rfaPa: string, index: number) : void {
    const entry = this.rfaPaEntries[index];
    entry.selectedNcabDates = [];
    entry.rfaErrRequired = false;
    entry.ncabErrRequired = false;
    if (this.ncabMap.has(rfaPa)) {
      console.debug('getNcabDates() - found ncab list for ', rfaPa);
      entry.availableNcabDates = this.ncabMap.get(rfaPa);
    } else {
      entry.availableNcabDates = [];
    }
    this.validateForRfaPaDuplicate();
    if (this.errActivityCodes.length > 0) {
      this.validateForActivityCodes();
    }
  }

  // Validate for duplication (from bottom to up)
  public validateForRfaPaDuplicate() {
    for (let i = this.rfaPaEntries.length - 1; i > 0; i--) {
      const rfaPa = this.rfaPaEntries[i].rfaPaNumber;
      let duplicated = false;
      if (rfaPa && rfaPa.length > 0) {
        for (let j = 0; j < i; j++) {
          if (rfaPa === this.rfaPaEntries[j].rfaPaNumber) {
            duplicated = true;
            break;
          }
        }
      }
      this.rfaPaEntries[i].rfaErrDuplcated = duplicated;
    }
  }

  // Validate for required fields
  public validateForRequired() {
    for (let entry of this.rfaPaEntries) {
      if (!entry.rfaPaNumber || entry.rfaPaNumber.length == 0) {
        entry.rfaErrRequired = true;
      }
      if (!entry.selectedNcabDates || entry.selectedNcabDates.length == 0) {
        entry.ncabErrRequired = true;
      }
    }
  }

  // Validate for activity codes
  public validateForActivityCodes() : boolean {
    const valid = this._validateForActivityCodes();
    const errs = [];
    if (!valid) {
      for (let entry of this.rfaPaEntries) {
        if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
          errs.push(entry.rfaPaNumber + ': ' + this.activityCodesMap.get(entry.rfaPaNumber));
        }
      }
    }
    this.errActivityCodes = errs;
    return valid;
  }

  _validateForActivityCodes() : boolean {
    for (let i = 0; i < this.rfaPaEntries.length - 1; i++) {
      if (this.rfaPaEntries[i].rfaPaNumber && this.rfaPaEntries[i].rfaPaNumber.length > 0) {
        const ac = this.activityCodesMap.get(this.rfaPaEntries[i].rfaPaNumber);
        for (let j = i + 1; j < this.rfaPaEntries.length; j++) {
          if (this.rfaPaEntries[j].rfaPaNumber && this.rfaPaEntries[j].rfaPaNumber.length > 0 &&
            ac != this.activityCodesMap.get(this.rfaPaEntries[j].rfaPaNumber)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Check for errors
  public isValid(): boolean {
    for (let entry of this.rfaPaEntries) {
      if (entry.rfaErrDuplcated || entry.rfaErrRequired || entry.ncabErrRequired || (entry.ncabErrors && entry.ncabErrors.length > 0)) {
        return false;
      }
    }
    if (this.errActivityCodes.length > 0) {
      return false;
    }
    return true;
  }
}

// =================================================================

@Component({
  selector: 'app-plan-step1',
  templateUrl: './plan-step1.component.html',
  styleUrls: ['./plan-step1.component.css']
})
export class PlanStep1Component implements OnInit {
  ncab_options: Options;
  searchCriteria: FundingPlanGrantsSearchCriteria;

  constructor(
    private fsPlanControllerService: FsPlanControllerService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    this.ncab_options = {
      multiple: true,
      allowClear: false
    };

    this.searchCriteria = new FundingPlanGrantsSearchCriteria();

    this.fsPlanControllerService.getRfaPaListUsingGET().subscribe(
      (result: Array<FundingPlanRfaPaDto>) => {
        console.debug('getRfaPaListUsingGET:', result);
        const tmp: Array<Select2OptionData> = [];
        let index = 0;
        for (let entry of result) {
          index = index + 1;
          if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
            tmp.push({
              id: entry.rfaPaNumber,
              text: entry.rfaPaNumber
            });
            const ncabTmp: Array<Select2OptionData> = [];
            for (let ncabEntry of entry.ncabs) {
              ncabTmp.push({
                id: ncabEntry.councilMeetingDate,
                text: ncabEntry.formattedCouncilMeetingDate,
                additional: ncabEntry
              });
            }
            this.searchCriteria.ncabMap.set(entry.rfaPaNumber, ncabTmp);
            this.searchCriteria.activityCodesMap.set(entry.rfaPaNumber, entry.activityCodes);
          }
        }
        this.searchCriteria.availableRfaPas = tmp;
      },
      error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

  }

  removeRfaPa(index: number) {
    this.logger.debug('removeRfaPa ', index);
    this.searchCriteria.rfaPaEntries.splice(index, 1);
    this.searchCriteria.validateForRfaPaDuplicate();
    if (this.searchCriteria.errActivityCodes.length > 0) {
      this.searchCriteria.validateForActivityCodes();
    }
  }

  appendRfaPa() {
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
  }

  clear() {
    this.searchCriteria.rfaPaEntries = [];
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
    this.searchCriteria.errActivityCodes = [];
  }

  search() {
    this.searchCriteria.validateForRfaPaDuplicate();
    this.searchCriteria.validateForRequired();
    this.searchCriteria.validateForActivityCodes();
    if (this.searchCriteria.isValid()) {
      alert('Validation successful.  To be continued...');
    }
  }
}
