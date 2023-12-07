import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { RequestModel } from '../../model/request/request-model';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { FundingSourceTypes } from '../../model/request/funding-source-types';
import { NGXLogger } from 'ngx-logger';
import { WorkflowModel } from '../workflow/workflow.model';

@Component({
  selector: 'app-create-type',
  templateUrl: './create-type.component.html',
  styleUrls: ['./create-type.component.css']
})
export class CreateTypeComponent implements OnInit {

  data: Array<Select2OptionData> = [];
  private _selectedValue: string;

  NO_TCS_ACTION_TYPES = [
    FundingSourceTypes.NIH_OD_CO_FUNDS, 
    FundingSourceTypes.NIH_NON_OD_CO_FUNDS,
    FundingSourceTypes.IDDA_REIMBURSABLE_INTER_AGENCY_FUNDS
  ];

  ROLLUP_TYPES = [
    FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS,
    FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__HIGH_PROGRAMMATIC_QUALITY,
    FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__OVER_75000_IN_A_BUDGET_PERIOD,
    FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__UP_TO_75000_IN_A_BUDGET_PERIOD,
    FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT,
    FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OTHER,
    FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS,
    FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_25000_IN_A_BUDGET_PERIOD,
    FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_25000_IN_A_BUDGET_PERIOD,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OTHER
  ];

  PRE_APPL_TYPES = [
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OTHER,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_25000_IN_A_BUDGET_PERIOD,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS,
    FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS,
    FundingRequestTypes.INTERIM_SUPPORT,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_DEFERRAL_OF_REISSUING_OF_FOA,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS__UP_TO_75000_DC,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS__OVER_75000_DC,
    FundingRequestTypes.INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION,
    FundingRequestTypes.INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION__UP_TO_400000_DC,
    FundingRequestTypes.INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION__OVER_400000_DC,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_DEFERRAL_FOR_ADMINISTRATIVE_CONVENIENCE,
    FundingRequestTypes.INTERIM_SUPPORT__REASON_DEFERRAL_FOR_SCIENTIFIC_REASONS,
    FundingRequestTypes.INTERIM_SUPPORT__GAP_FUNDING,
    FundingRequestTypes.INTERIM_SUPPORT__GAP_FUNDING__INTERIM_SUPPORT_AND_RENEWED_TO_BE_FUNDING_IN_SAME_FY,
    FundingRequestTypes.INTERIM_SUPPORT__GAP_FUNDING__INTERIM_SUPPORT_AND_RENEWED_TO_BE_FUNDING_IN_DIFFERENT_FY,
    FundingRequestTypes.INTERIM_SUPPORT__END_OF_PROJECT_PERIOD,
    FundingRequestTypes.PHASE_OUT,
    FundingRequestTypes.PHASE_OUT__UP_TO_400000_DC,
    FundingRequestTypes.PHASE_OUT__OVER_400000_DC,
    FundingRequestTypes.PHASE_OUT__EXCEPTIONAL_CIRCUMSTANCES,
    FundingRequestTypes.PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS,
    FundingRequestTypes.PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS__UP_TO_SIX_MONTHS_FUNDING,
    FundingRequestTypes.PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS__MORE_THAN_SIX_MONTHS_FUNDING,
    FundingRequestTypes.PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP,
    FundingRequestTypes.PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP__UP_TO_100000_DIRECT_COSTS,
    FundingRequestTypes.PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP__OVER_100000_DIRECT_COSTS,
    FundingRequestTypes.PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_WITH_STRONG_JUSTIFICATION,
    FundingRequestTypes.DIVERSITY_SUPPLEMENT_INCLUDES_CURE_SUPPLEMENTS,
    FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS,
    FundingRequestTypes.PAY_TYPE_4
  ];

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();
  @Input() readOnly = false;

  set selectedValue(value: string) {
    this._selectedValue = value;
    this.requestModel.requestDto.oefiaCreateCode = value;
    this.requestModel.requestDto.financialInfoDto.oefiaCreateCode = value;

    this.selectedValueChange.emit(value);
  }

  constructor(
    public requestModel: RequestModel,
    private workflowModel: WorkflowModel,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (this.readOnly) {
      return;
    }
    const sources = this.requestModel.programRecommendedCostsModel.fundingSources.map(source => source.fundingSourceId);
    const noTcs = sources.some(e => this.NO_TCS_ACTION_TYPES.includes(e))

    this.data = [];
    if(noTcs) {
      this.data.push({id: 'NO-TCS-ACTION', text: 'No TCS Action'});
    }
    this.data.push({ id: 'PRE-APPL', text: 'Pre-Appl' });
    if (!this.requestModel.isPayType4() && this.requestModel.isForGrantFY()) {
      this.data.push({ id: 'ROLLUP', text: 'Rollup' });
    }
    const type = Number(this.requestModel.requestDto.frtId);

    if(noTcs) {
      this.selectedValue = this.requestModel.requestDto.oefiaCreateCode || 'NO-TCS-ACTION';
    } else if ( this.requestModel.isForGrantFY()
        && ((this.ROLLUP_TYPES.includes(+type)
        && !this.workflowModel.approvedByNciFC) || (this.requestModel.isNonNci() && this.requestModel.isCompeting() && +type === FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS ))) {
      if(!this.data.filter(item => item.id === 'ROLLUP')) {
        this.data.push({ id: 'ROLLUP', text: 'Rollup' });
      }
      this.selectedValue = this.requestModel.requestDto.oefiaCreateCode || 'ROLLUP';
    } else if ( this.PRE_APPL_TYPES.includes(+type)
                && !this.workflowModel.approvedByNciFC ) {
      this.selectedValue = this.requestModel.requestDto.oefiaCreateCode || 'PRE-APPL';
    } else {
      this.selectedValue = this.requestModel.requestDto.oefiaCreateCode;
    }
  }

}
