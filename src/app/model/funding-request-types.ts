import {FundingSourceTypes} from './funding-source-types';

export enum FundingRequestTypes {
  PAY_BY_EXCEPTION = 2,
  PAY_BY_EXCEPTION__WITHIN_DOC_EXCEPTION_SELECTIONS = 3,
  PAY_BY_EXCEPTION__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS = 4,
  PAY_BY_EXCEPTION__NCI_RFA = 22,
  PAY_BY_EXCEPTION__GENERAL_EXCEPTION = 47,
  REINSTATEMENT_OF_DELETED_COSTS = 5,
  REINSTATEMENT_OF_DELETED_COSTS__UP_TO_75000_IN_A_BUDGET_PERIOD = 6,
  REINSTATEMENT_OF_DELETED_COSTS__OVER_75000_IN_A_BUDGET_PERIOD = 7,
  REINSTATEMENT_OF_DELETED_COSTS__HIGH_PROGRAMMATIC_QUALITY = 1002,
  GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD = 9,
  GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_25000_IN_A_BUDGET_PERIOD = 10,
  GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS = 11,
  GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS = 12,
  GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OTHER = 1003,
  INTERIM_SUPPORT = 13,
  INTERIM_SUPPORT__REASON_DEFERRAL_OF_REISSUING_OF_FOA = 14,
  INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS = 15,
  INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS__UP_TO_75000_DC = 16,
  INTERIM_SUPPORT__REASON_ADMINISTRATIVE_SCIENTIFIC_REASONS__OVER_75000_DC = 17,
  INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION = 18,
  INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION__UP_TO_400000_DC = 19,
  INTERIM_SUPPORT__WHILE_WAITING_FOR_REVIEW_OF_A_DELAYED_OR_AMENDED_APPLICATION__OVER_400000_DC = 20,
  INTERIM_SUPPORT__REASON_DEFERRAL_FOR_ADMINISTRATIVE_CONVENIENCE = 1004,
  INTERIM_SUPPORT__REASON_DEFERRAL_FOR_SCIENTIFIC_REASONS = 1005,
  INTERIM_SUPPORT__GAP_FUNDING = 1006,
  INTERIM_SUPPORT__GAP_FUNDING__INTERIM_SUPPORT_AND_RENEWED_TO_BE_FUNDING_IN_SAME_FY = 1007,
  INTERIM_SUPPORT__GAP_FUNDING__INTERIM_SUPPORT_AND_RENEWED_TO_BE_FUNDING_IN_DIFFERENT_FY = 1008,
  INTERIM_SUPPORT__END_OF_PROJECT_PERIOD = 1010,
  SKIP = 21,
  SKIP__NCI_RFA = 28,
  PAY_USING_SKIP_FUNDS = 23,
  PAY_USING_SKIP_FUNDS__WITHIN_DOC_EXCEPTION_SELECTIONS = 31,
  PAY_USING_SKIP_FUNDS__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS = 32,
  PAY_USING_SKIP_FUNDS__NCI_RFA = 43,
  PAY_USING_SKIP_FUNDS__GENERIC_PAY_USING_SKIP_FUNDS = 49,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT = 24,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS = 34,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS = 35,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__WITHIN_NCIS_PAYLINE = 40,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OTHER = 44,
  PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__NCI_RFA = 52,
  EARLY_PAY = 25,
  EARLY_PAY__DOC_SELECTIONS = 36,
  PAY_A_POST_NCAB_TRANSFERRED_APPLICATION = 26,
  PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__WITHIN_NCIS_PAYLINE = 37,
  PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS = 38,
  PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS = 39,
  PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OTHER = 51,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION = 27,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION__WITHIN_NCIS_PAYLINE = 33,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS_PROPOSED = 41,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS_PROPOSED = 42,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OTHER = 50,
  CO_FUND_A_NON_NCI_COMPETING_APPLICATION__CO_FUND_AN_NCI_RFA = 110,
  PAY_CONFERENCE_APPLICATION = 29,
  OTHER_PAY_COMPETING_ONLY = 30,
  RESTORATION_OF_A_FUTURE_YEAR = 45,
  PHASE_OUT = 46,
  PHASE_OUT__UP_TO_400000_DC = 48,
  PHASE_OUT__OVER_400000_DC = 53,
  PHASE_OUT__EXCEPTIONAL_CIRCUMSTANCES = 1009,
  PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS = 1011,
  PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS__UP_TO_SIX_MONTHS_FUNDING = 1014,
  PHASE_OUT__FOR_STATISTICAL_CENTER_AND_HEADQUARTERS_AWARDS__MORE_THAN_SIX_MONTHS_FUNDING = 1015,
  PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP = 1012,
  PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP__UP_TO_100000_DIRECT_COSTS = 1016,
  PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_THAT_DID_NOT_MEET_INSTITUTIONAL_PAYLINE_FOR_COMPETING_GROUP__OVER_100000_DIRECT_COSTS = 1017,
  PHASE_OUT__FOR_INSTITUTIONAL_AWARDS_WITH_STRONG_JUSTIFICATION = 1013,
  DIVERSITY_SUPPLEMENT_INCLUDES_CURE_SUPPLEMENTS = 1000,
  SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS = 1001,
  CO_FUND_A_NON_NCI_NON_COMPETING_GRANT = 1018,
  CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_25000_IN_A_BUDGET_PERIOD = 1019,
  CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS = 1020,
  CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS = 1021,
  CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OTHER = 1022,
  FUNDING_PLAN = 1023,
  FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE = 1024,
  FUNDING_PLAN__FUNDING_PLAN_SKIP = 1025,
  FUNDING_PLAN__FUNDING_PLAN_EXCEPTION = 1026,
  FUNDING_PLAN__NOT_PROPOSED_AND_OUTSIDE_FUNDING_PLAN_SCORE_RANGE = 1027,
  FUNDING_PLAN__NOT_SELECTABLE_FOR_FUNDING_PLAN = 1028,
  PAY_TYPE_4 = 1029
}

// NOTE: we might not need to track all of these, just the parent type.
export const INITIAL_PAY_TYPES = [
  FundingRequestTypes.PAY_BY_EXCEPTION,
  FundingRequestTypes.PAY_BY_EXCEPTION__WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_BY_EXCEPTION__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_BY_EXCEPTION__NCI_RFA,
  FundingRequestTypes.PAY_BY_EXCEPTION__GENERAL_EXCEPTION,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__NCI_RFA,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__GENERIC_PAY_USING_SKIP_FUNDS,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__WITHIN_NCIS_PAYLINE,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OTHER,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__NCI_RFA,
  FundingRequestTypes.EARLY_PAY,
  FundingRequestTypes.EARLY_PAY__DOC_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__WITHIN_NCIS_PAYLINE,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OTHER,
  FundingRequestTypes.PAY_CONFERENCE_APPLICATION,
  FundingRequestTypes.OTHER_PAY_COMPETING_ONLY,
  FundingRequestTypes.SKIP,
  FundingRequestTypes.SKIP__NCI_RFA,
  FundingRequestTypes.PAY_TYPE_4
];

export const PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES = [
  FundingRequestTypes.PAY_BY_EXCEPTION,
  FundingRequestTypes.PAY_BY_EXCEPTION__WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_BY_EXCEPTION__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_BY_EXCEPTION__NCI_RFA,
  FundingRequestTypes.PAY_BY_EXCEPTION__GENERAL_EXCEPTION,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__NCI_RFA,
  FundingRequestTypes.PAY_USING_SKIP_FUNDS__GENERIC_PAY_USING_SKIP_FUNDS,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION__WITHIN_NCIS_PAYLINE,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS_PROPOSED,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS_PROPOSED,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION__OTHER,
  FundingRequestTypes.CO_FUND_A_NON_NCI_COMPETING_APPLICATION__CO_FUND_AN_NCI_RFA,
  FundingRequestTypes.DIVERSITY_SUPPLEMENT_INCLUDES_CURE_SUPPLEMENTS,
  FundingRequestTypes.PAY_CONFERENCE_APPLICATION,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__WITHIN_NCIS_PAYLINE,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__OTHER,
  FundingRequestTypes.PAY_ORIGINAL_APPLICATION_INSTEAD_OF_SCORED_AMENDMENT__NCI_RFA,
  FundingRequestTypes.EARLY_PAY,
  FundingRequestTypes.EARLY_PAY__DOC_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__WITHIN_NCIS_PAYLINE,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_WITHIN_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OUTSIDE_OF_NCIS_PAYLINE_AND_OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
  FundingRequestTypes.PAY_A_POST_NCAB_TRANSFERRED_APPLICATION__OTHER,
  FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR,
  FundingRequestTypes.OTHER_PAY_COMPETING_ONLY,
];

export const PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES = [
  FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS,
  FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__UP_TO_75000_IN_A_BUDGET_PERIOD,
  FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__OVER_75000_IN_A_BUDGET_PERIOD,
  FundingRequestTypes.REINSTATEMENT_OF_DELETED_COSTS__HIGH_PROGRAMMATIC_QUALITY,
  FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD,
  FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_25000_IN_A_BUDGET_PERIOD,
  FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS,
  FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS,
  FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD__OTHER,
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
  FundingRequestTypes.PAY_TYPE_4,
  FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR,
  FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT,
  FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_25000_IN_A_BUDGET_PERIOD,
  FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__UP_TO_150000_DC_IN_A_BUDGET_PERIOD_AND_NOT_EXCEEDING_450000_FOR_ALL_YEARS,
  FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OVER_150000_DC_IN_A_BUDGET_PERIOD_OR_OVER_450000_FOR_ALL_YEARS,
  FundingRequestTypes.CO_FUND_A_NON_NCI_NON_COMPETING_GRANT__OTHER,
  FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS,
];
