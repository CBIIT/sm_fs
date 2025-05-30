import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiModule as CommonApiModule, BASE_PATH as COMMON_BASE_PATH } from '@cbiit/i2ecommonws-lib';
import { ApiModule as FSApiModule, BASE_PATH as FS_BASE_PATH } from '@cbiit/i2efsws-lib';
import { ApiModule as RefApiModule, BASE_PATH as REF_BASE_PATH } from '@cbiit/i2erefws-lib';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgSelect2Module } from 'ng-select2';
import {
  AppPropertiesService,
  ChangeUserInterceptor,
  GwbLinksService,
  I2ecuiLibModule,
  CustomLoggerMetadataService,
  INSERT_CHANGE_USER_HEADER,
  INSERT_CHANGE_USER_PARAM,
  DEBUG_CHANGE_USER,
  PROPERTIES_APP_NAME,
  PROPERTIES_ENVIRONMENT
} from "@cbiit/i2ecui-lib";
import { NgbModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { HeaderComponent } from './header/header.component';
import { SearchFilterComponent } from './search/search-filter/search-filter.component';
import { FundingRequestTypeComponent } from './funding-request/funding-request-type/funding-request-type.component';
import { SearchPoolComponent } from './search/search-filter/search-pool/search-pool.component';
import { SearchComponent } from './search/search.component';
import { FundingPlanComponent } from './funding-plan/funding-plan.component';
import { FsMenuComponent } from './fs-menu/fs-menu.component';
import { environment } from 'src/environments/environment';
import { SearchResultComponent } from './search/search-result/search-result.component';
import { StepIndicatorComponent } from './funding-request/step-indicator/step-indicator.component';
import { FundingRequestComponent } from './funding-request/funding-request.component';
import { Step1Component } from './funding-request/step1/step1.component';
import { Step3Component } from './funding-request/step3/step3.component';
import { Step2Component } from './funding-request/step2/step2.component';
import { Step4Component } from './funding-request/step4/step4.component';
import { DataTablesModule } from 'angular-datatables';
import { AppLookupsService } from './service/app-lookups.service';
import { CodeDescriptionPipe } from './pipes/code-description.pipe';
import { RequestModel } from './model/request/request-model';
import { PlanModel } from './model/plan/plan-model';
import { AppUserSessionService } from './service/app-user-session.service';
import { GrantInformationComponent } from './grant-information/grant-information.component';
import { ProgramRecommendedCostsComponent } from './program-recommended-costs/program-recommended-costs.component';
import { RequestInformationComponent } from './funding-request/request-information/request-information.component';
import {
  RequestInformationReadonlyComponent
} from './request-information-readonly/request-information-readonly.component';
import { RequestHistoryComponent } from './request-history/request-history.component';
import {
  NextScheduledApproversRequestReadonlyComponent
} from './next-scheduled-approvers-request-readonly/next-scheduled-approvers-request-readonly.component';
import {
  NextScheduledApproversRequestComponent
} from './next-scheduled-approvers-request/next-scheduled-approvers-request.component';
import { FundingSourceComponent } from './funding-source/funding-source.component';
import {
  OtherDocsContributingFundsComponent
} from './other-docs-contributing-funds/other-docs-contributing-funds.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FundingSourcesNamesComponent } from './funding-sources-names/funding-sources-names.component';
import { FinalLoaComponent } from './final-loa/final-loa.component';
import { LoggerModule, NgxLoggerLevel, TOKEN_LOGGER_METADATA_SERVICE } from "ngx-logger";
import { SkippedGrantsComponent } from './skipped-grants/skipped-grants.component';
import { FooterComponent } from './footer/footer.component';
import { DiversitySupplementComponent } from './diversity-supplement/diversity-supplement.component';
import { NewInvestigatorComponent } from './new-investigator/new-investigator.component';
import { WorkflowModalComponent } from './funding-request/workflow-modal/workflow-modal.component';
import { RetrieveRequestComponent } from './funding-request/retrieve-request/retrieve-request.component';
import {
  Type4ConversionActivityCodeComponent
} from './type4-conversion-mechanism/type4-conversion-activity-code.component';
import { AlertBillboardComponent } from './alert-billboard/alert-billboard.component';
import { OpenRequestComponent } from './search/open-request/open-request.component';
import { WorkflowComponent } from './funding-request/workflow/workflow.component';
import { ApproverListComponent } from './funding-request/workflow/approver-list/approver-list.component';
import { FundingSourceCostValidatorDirective } from './validators/funding-source-cost-validator.directive';
import { DiversitySupplementValidatorDirective } from './validators/diversity-supplement-validator.directive';
import { PdNameRequiredValidatorDirective } from './validators/pd-name-required-validator.directive';
import { CancerActivityRequiredValidatorDirective } from './validators/cancer-activity-required-validator.directive';
import { UploadBudgetDocumentsComponent } from './upload-budget-documents/upload-budget-documents.component';
import { ApprovedCostsComponent } from './funding-request/workflow/approved-costs/approved-costs.component';
import { BudgetInfoComponent } from './cans/budget-info/budget-info.component';
import { ActiveInitialPayValidatorDirective } from './validators/active-initial-pay-validator.directive';
import { OefiaTypesComponent } from './cans/oefia-types/oefia-types.component';
import { ProjectedCanComponent } from './cans/projected-can/projected-can.component';
import { CanSelectorComponent } from './cans/can-selector/can-selector.component';
import {
  FullGrantNumberCellRendererComponent
} from './table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import {
  CancerActivityCellRendererComponent
} from './table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import {
  ExistingRequestsCellRendererComponent
} from './table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component';
import {
  FundingRequestActionCellRendererComponent
} from './funding-request/step1/funding-request-action-cell-renderer/funding-request-action-cell-renderer.component';
import { FundableScoreRangeComponent } from './funding-plan/fundable-score-range/fundable-score-range.component';
import { GrantTableComponent } from './funding-plan/grant-table/grant-table.component';
import { MinMaxValidatorDirective } from './validators/min-max-validator.directive';
import { GmInfoComponent } from './funding-request/workflow/gm-info/gm-info.component';
import { PlanStep1Component } from './funding-plan/plan-step1/plan-step1.component';
import { PlanStep2Component } from './funding-plan/plan-step2/plan-step2.component';
import { PlanStep3Component } from './funding-plan/plan-step3/plan-step3.component';
import { PlanStep4Component } from './funding-plan/plan-step4/plan-step4.component';
import { PlanStep5Component } from './funding-plan/plan-step5/plan-step5.component';
import { PlanStep6Component } from './funding-plan/plan-step6/plan-step6.component';
import {
  ApproverNameRendererComponent
} from './funding-request/workflow/approver-list/approver-name-renderer/approver-name-renderer.component';
import {
  SupportingDocsReadonlyComponent
} from './funding-request/supporting-docs-readonly/supporting-docs-readonly.component';
import { PercentTogglePipe } from './pipes/percent-toggle-pipe';
import { SubmissionAlertComponent } from './funding-request/workflow/submission-alert/submission-alert.component';
import { BudgetDocsReadonlyComponent } from './funding-request/budget-docs-readonly/budget-docs-readonly.component';
import { CreateTypeComponent } from './funding-request/create-type/create-type.component';
import {
  SelectGrantCheckboxCellRendererComponent
} from './funding-plan/plan-step1/select-grant-checkbox-cell-renderer/select-grant-checkbox-cell-renderer.component';
import { ConceptAwardTrackingComponent } from './funding-plan/concept-award-tracking/concept-award-tracking.component';
import { PlanCoverPageComponent } from './funding-plan/plan-step5/plan-cover-page/plan-cover-page.component';
import { PlanFileUploadComponent } from './funding-plan/plan-step5/plan-file-upload/plan-file-upload.component';
import {
  PlanSummaryStatementComponent
} from './funding-plan/plan-step5/plan-summary-statement/plan-summary-statement.component';
import {
  ApplicationsProposedForFundingComponent
} from './funding-plan/applications-proposed-for-funding/applications-proposed-for-funding.component';
import {
  FundingPlanInformationComponent
} from './funding-plan/funding-plan-information/funding-plan-information.component';
import { PlanInfoIssueTypeComponent } from './funding-plan/plan-info-issue-type/plan-info-issue-type.component';
import { FpGrantInformationComponent } from './funding-plan/fp-grant-information/fp-grant-information.component';
import {
  FpProgramRecommendedCostsComponent
} from './funding-plan/fp-program-recommended-costs/fp-program-recommended-costs.component';
import { FpFundingInformationComponent } from './funding-plan/fp-funding-information/fp-funding-information.component';
import { ManageDesignationsComponent } from './manage-designations/manage-designations.component';
import { DateInPastValidatorDirective } from './manage-designations/date-in-past.directive';
import { EndDateBeforeStartValidatorDirective } from './manage-designations/end-date-before-start-validator.directive';
import {
  RecommendedFutureYearsComponent
} from './funding-plan/recommended-future-years/recommended-future-years.component';
import { FpFundingSourceComponent } from './funding-plan/fp-funding-source/fp-funding-source.component';
import { FundingInformationValidatorDirective } from './validators/funding-information-validator.directive';
import { PercentPipe } from '@angular/common';
import { PlanWorkflowComponent } from './funding-plan/fp-workflow/plan-workflow.component';
import {
  PlanSupportingDocsReadonlyComponent
} from './funding-plan/plan-step6/plan-supporting-docs-readonly/plan-supporting-docs-readonly.component';
import {
  DesigneeCellRendererComponent
} from './manage-designations/designee-cell-renderer/designee-cell-renderer.component';
import {
  DesigneeActionCellRendererComponent
} from './manage-designations/designee-action-cell-renderer/designee-action-cell-renderer.component';
import { EditDesigneeModalComponent } from './manage-designations/edit-designee-modal/edit-designee-modal.component';
import { RetrievePlanComponent } from './funding-plan/retrieve-plan/retrieve-plan.component';
import { RfaReissueValidatorDirective } from './validators/rfa-reissue-validator.directive';
import { FpSetAsideValidatorDirective } from './validators/fp-set-aside-validator.directive';
import {
  PlanSubmissionAlertComponent
} from './funding-plan/plan-step6/plan-submission-alert/plan-submission-alert.component';
import { PlanWarningComponent } from './funding-plan/plan-step6/plan-warning/plan-warning.component';
import { ActiveFundingPlanValidatorDirective } from './validators/active-funding-plan-validator.directive';
import { DocsGrantTableComponent } from './funding-plan/plan-step5/docs-grant-table/docs-grant-table.component';
import { ConfirmDeleteModalComponent } from './manage-designations/confirm-delete-modal/confirm-delete-modal.component';
import { CanSearchComponent } from './shared/can-search/can-search.component';
import {
  ApplicationsProposedForFundingReadonlyComponent
} from './funding-plan/applications-proposed-for-funding-readonly/applications-proposed-for-funding-readonly.component';
import { FpBudgetInformationComponent } from './funding-plan/fp-budget-information/fp-budget-information.component';
import { FoaHyperlinkComponent } from './funding-plan/foa-hyperlink/foa-hyperlink.component';
import { GrantCostRendererComponent } from './funding-plan/grant-cost-renderer/grant-cost-renderer.component';
import {
  FundingSourceRendererComponent
} from './funding-plan/funding-source-renderer/funding-source-renderer.component';
import { ProjectedCanRendererComponent } from './funding-plan/projected-can-renderer/projected-can-renderer.component';
import { CanSelectorRendererComponent } from './funding-plan/can-selector-renderer/can-selector-renderer.component';
import { FpCanSelectorComponent } from './funding-plan/fp-can-selector/fp-can-selector.component';
import {
  FpGrantManagementComponent
} from './funding-plan/fp-workflow/fp-grant-management/fp-grant-management.component';
import { FpProjectedCanComponent } from './funding-plan/fp-projected-can/fp-projected-can.component';
import { CanSearchModalComponent } from './cans/can-search-modal/can-search-modal.component';
import {
  FundingSourceEntryModalComponent
} from './funding-plan/applications-proposed-for-funding/funding-source-entry-modal/funding-source-entry-modal.component';
import {
  SearchFundingRequestActionCellRendererComponent
} from './search/search-result/search-funding-request-action-cell-renderer/search-funding-request-action-cell-renderer.component';
import {
  WorkflowWarningModalComponent
} from './funding-request/workflow/warning-modal/workflow-warning-modal.component';
import {
  SearchFundingRequestTypeComponent
} from './search/search-filter/search-funding-request-type/search-funding-request-type.component';
import {
  SearchFundingPlanFoasCellRendererComponent
} from './search/search-result/search-funding-plan-foas-cell-renderer/search-funding-plan-foas-cell-renderer.component';
import {
  SearchRfaPaDropdownComponent
} from './search/search-filter/search-rfa-pa-dropdown/search-rfa-pa-dropdown.component';
import {
  SearchFundingRequestDocComponent
} from './search/search-filter/search-funding-request-doc/search-funding-request-doc.component';
import {
  SearchFundingSourceComponent
} from './search/search-filter/search-funding-source/search-funding-source.component';
import { BatchApproveModalComponent } from './search/batch-approve/batch-approve-modal.component';
import { OefiaTypeRendererComponent } from './funding-plan/oefia-type-renderer/oefia-type-renderer.component';
import { RequestWarningComponent } from './funding-request/step4/request-warning/request-warning.component';
import {
  SearchGrantExistInRequestCellRendererComponent
} from './search/search-result/search-grant-exist-in-request-cell-renderer/search-grant-exist-in-request-cell-renderer.component';
import {
  SearchGrantExistInPlanCellRendererComponent
} from './search/search-result/search-grant-exist-in-plan-cell-renderer/search-grant-exist-in-plan-cell-renderer.component';
import { OneFundedGrantValidatorDirective } from './validators/one-funded-grant-validator.directive';
import { GrantFundedOnceValidatorDirective } from './validators/grant-funded-once-validator.directive';
import {
  SearchGrantExistInPaylistCellRendererComponent
} from './search/search-result/search-grant-exist-in-paylist-cell-renderer/search-grant-exist-in-paylist-cell-renderer.component';
import {
  FpWorkflowWarningModalComponent
} from './funding-plan/fp-workflow/fp-warning-modal/fp-workflow-warning-modal.component';
import { DEBUG_ERROR_INTERCEPTOR, ErrorInterceptor } from "./interceptors/error-interceptor.service";
import { ErrorComponent } from './error/error/error.component';
import { SessionRestoreComponent } from './session/session-restore/session-restore.component';
import { CookieModule } from 'ngx-cookie';
import { SearchFundingRequestApprvlRoleComponent } from './search/search-filter/search-funding-request-apprvl-role/search-funding-request-apprvl-role.component';
import { R00PdNameRequiredValidatorDirective } from './validators/r00-pd-name-required-validator.directive';
import { R00CancerActivityRequiredValidatorDirective } from './validators/r00-cancer-activity-required-validator.directive';
import { UniquePdValidatorDirective } from './validators/unique-pd-validator.directive';
import { Router } from '@angular/router';
import { ErrorHandlerService } from './error/error-handler.service';
import { CancerActivitiesDropdownComponent} from "./cancer-activities-dropdown/cancer-activities-dropdown.component";
import { PdnameDropdownComponent} from "./pdname-dropdown/pdname-dropdown.component";
import { EditLinkComponent } from './edit-link/edit-link.component';

export function initializeAppProperties(appPropertiesService: AppPropertiesService): any {
  return (): Promise<any> => {
    return appPropertiesService.initialize();
  };
}

export function initializeUserSession(userSessionService: AppUserSessionService): any {
  return (): Promise<any> => {
    return userSessionService.initialize();
  };
}

export function initializeLookupMaps(lookupService: AppLookupsService): any {
  return (): Promise<any> => {
    return lookupService.initialize();
  };
}

export function megaInitializer(
  userSessionService: AppUserSessionService,
  appPropertiesService: AppPropertiesService,
  lookupService: AppLookupsService,
  gwbLinksService: GwbLinksService,
  router: Router,
  errorHandler: ErrorHandlerService): any {
  return (): Promise<any> => {
    return userSessionService.initialize()
      .then(function() {
        return appPropertiesService.initialize();
      })
      .then(function() {
        return lookupService.initialize();
      })
      .then(function() {
        return gwbLinksService.initialize();
      }).catch(oops => {
        console.log('initializer failed; redirect to home');
        if(oops.status === 200) {
          console.log(`window.location.href: ${window.location.href}`);
          // @ts-ignore
          window.location.reload(true);
        }
        return new Promise<boolean>((resolve, reject) => {
          errorHandler.registerNewError(Date.now(), oops);
          reject(oops);
        });
      });
  };
}

@NgModule({ declarations: [
        AppComponent,
        SearchFilterComponent,
        FundingRequestTypeComponent,
        SearchPoolComponent,
        HeaderComponent,
        SearchComponent,
        FundingPlanComponent,
        FsMenuComponent,
        SearchResultComponent,
        StepIndicatorComponent,
        FundingRequestComponent,
        Step1Component,
        Step3Component,
        Step2Component,
        Step4Component,
        CodeDescriptionPipe,
        GrantInformationComponent,
        ProgramRecommendedCostsComponent,
        RequestInformationComponent,
        RequestInformationReadonlyComponent,
        RequestHistoryComponent,
        NextScheduledApproversRequestReadonlyComponent,
        NextScheduledApproversRequestComponent,
        FundingSourceComponent,
        OtherDocsContributingFundsComponent,
        FundingSourcesNamesComponent,
        FinalLoaComponent,
        SkippedGrantsComponent,
        FooterComponent,
        DiversitySupplementComponent,
        NewInvestigatorComponent,
        WorkflowModalComponent,
        Type4ConversionActivityCodeComponent,
        RetrieveRequestComponent,
        AlertBillboardComponent,
        OpenRequestComponent,
        WorkflowComponent,
        ApproverListComponent,
        FundingSourceCostValidatorDirective,
        DiversitySupplementValidatorDirective,
        PdNameRequiredValidatorDirective,
        CancerActivityRequiredValidatorDirective,
        UploadBudgetDocumentsComponent,
        ApprovedCostsComponent,
        BudgetInfoComponent,
        ActiveInitialPayValidatorDirective,
        OefiaTypesComponent,
        ProjectedCanComponent,
        CanSelectorComponent,
        FullGrantNumberCellRendererComponent,
        CancerActivityCellRendererComponent,
        ExistingRequestsCellRendererComponent,
        FundingRequestActionCellRendererComponent,
        FundableScoreRangeComponent,
        GrantTableComponent,
        MinMaxValidatorDirective,
        GmInfoComponent,
        PlanStep1Component,
        PlanStep2Component,
        PlanStep3Component,
        PlanStep4Component,
        PlanStep5Component,
        PlanStep6Component,
        ApproverNameRendererComponent,
        SupportingDocsReadonlyComponent,
        PercentTogglePipe,
        SubmissionAlertComponent,
        BudgetDocsReadonlyComponent,
        CreateTypeComponent,
        SelectGrantCheckboxCellRendererComponent,
        ConceptAwardTrackingComponent,
        PlanCoverPageComponent,
        PlanFileUploadComponent,
        PlanSummaryStatementComponent,
        ApplicationsProposedForFundingComponent,
        FundingPlanInformationComponent,
        PlanInfoIssueTypeComponent,
        FpGrantInformationComponent,
        FpProgramRecommendedCostsComponent,
        FpFundingInformationComponent,
        ManageDesignationsComponent,
        DateInPastValidatorDirective,
        EndDateBeforeStartValidatorDirective,
        RecommendedFutureYearsComponent,
        FpFundingSourceComponent,
        FundingInformationValidatorDirective,
        PlanSupportingDocsReadonlyComponent,
        PlanWorkflowComponent,
        PlanSubmissionAlertComponent,
        DesigneeCellRendererComponent,
        DesigneeActionCellRendererComponent,
        EditDesigneeModalComponent,
        RetrievePlanComponent,
        RfaReissueValidatorDirective,
        FpSetAsideValidatorDirective,
        PlanWarningComponent,
        ActiveFundingPlanValidatorDirective,
        DocsGrantTableComponent,
        ConfirmDeleteModalComponent,
        CanSearchComponent,
        ApplicationsProposedForFundingReadonlyComponent,
        FpBudgetInformationComponent,
        FoaHyperlinkComponent,
        GrantCostRendererComponent,
        FundingSourceRendererComponent,
        ProjectedCanRendererComponent,
        CanSelectorRendererComponent,
        FpCanSelectorComponent,
        FpGrantManagementComponent,
        FpProjectedCanComponent,
        CanSearchModalComponent,
        FundingSourceEntryModalComponent,
        SearchFundingRequestActionCellRendererComponent,
        WorkflowWarningModalComponent,
        FpWorkflowWarningModalComponent,
        SearchFundingRequestTypeComponent,
        SearchFundingPlanFoasCellRendererComponent,
        SearchRfaPaDropdownComponent,
        SearchFundingRequestDocComponent,
        SearchFundingSourceComponent,
        BatchApproveModalComponent,
        OefiaTypeRendererComponent,
        RequestWarningComponent,
        SearchGrantExistInRequestCellRendererComponent,
        SearchGrantExistInPlanCellRendererComponent,
        OneFundedGrantValidatorDirective,
        GrantFundedOnceValidatorDirective,
        SearchGrantExistInPaylistCellRendererComponent,
        ErrorComponent,
        SessionRestoreComponent,
        SearchFundingRequestApprvlRoleComponent,
        R00PdNameRequiredValidatorDirective,
        R00CancerActivityRequiredValidatorDirective,
        UniquePdValidatorDirective,
        CancerActivitiesDropdownComponent,
        PdnameDropdownComponent,
        EditLinkComponent
    ],
    bootstrap: [AppComponent],
    imports: [BrowserModule, NgbAccordionModule,
        AppRoutingModule,
        I2ecuiLibModule,
        CommonApiModule,
        FSApiModule,
        RefApiModule,
        NgSelect2Module,
        NgbModule,
        FormsModule,
        DataTablesModule,
        DragDropModule,
        LoggerModule.forRoot({
            serverLoggingUrl: '/i2ecommonws/api/v1/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.INFO, enableSourceMaps: true
        }, {
            metadataProvider: { provide: TOKEN_LOGGER_METADATA_SERVICE, useClass: CustomLoggerMetadataService },
        }),
        CookieModule.forRoot()
], providers: [RequestModel, PlanModel, PercentPipe,
        { provide: COMMON_BASE_PATH, useValue: '/i2ecommonws' },
        { provide: FS_BASE_PATH, useValue: '/i2efsws' },
        { provide: REF_BASE_PATH, useValue: '/i2erefws' },
        { provide: PROPERTIES_APP_NAME, useValue: 'FUNDING-SELECTIONS' },
        { provide: PROPERTIES_ENVIRONMENT, useValue: environment },
        { provide: INSERT_CHANGE_USER_HEADER, useValue: true },
        { provide: INSERT_CHANGE_USER_PARAM, useValue: true },
        { provide: DEBUG_CHANGE_USER, useValue: false },
        { provide: DEBUG_ERROR_INTERCEPTOR, useValue: true },
        { provide: HTTP_INTERCEPTORS, useClass: ChangeUserInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        {
            provide: APP_INITIALIZER, useFactory: megaInitializer,
            deps: [AppUserSessionService, AppPropertiesService, AppLookupsService, GwbLinksService, Router, ErrorHandlerService], multi: true
        }, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule {
}
