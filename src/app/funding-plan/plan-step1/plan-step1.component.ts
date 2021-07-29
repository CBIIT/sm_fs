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
  availableRfaPas: Array<Select2OptionData> = [];

  constructor() {
    this.ncabMap = new Map<string, Array<Select2OptionData>>();
    this.rfaPaEntries.push(new RfaPaEntry(this))
  }

  public onChangeRfaPaEntry(rfaPa: string, index: number) : void {
    const entry = this.rfaPaEntries[index];
    entry.selectedNcabDates = [];
    if (this.ncabMap.has(rfaPa)) {
      console.debug('getNcabDates() - found ncab list for ', rfaPa);
      entry.availableNcabDates = this.ncabMap.get(rfaPa);
    } else {
      entry.availableNcabDates = [];
    }
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
  }

  appendRfaPa() {
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
  }
}
