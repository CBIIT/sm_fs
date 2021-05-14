import {APP_INITIALIZER, NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ApiModule, BASE_PATH} from '@nci-cbiit/i2ecws-lib';
import { HTTP_INTERCEPTORS,HttpClientModule} from '@angular/common/http';
import {NgSelect2Module} from 'ng-select2';
import {I2ecuiLibModule} from '@nci-cbiit/i2ecui-lib';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {HeaderComponent} from './header/header.component';
import {SearchFilterComponent} from './search/search-filter/search-filter.component';
import {FundingRequestTypeComponent} from './funding-request-type/funding-request-type.component';
import {SearchPoolComponent} from './search/search-filter/search-pool/search-pool.component';
import {SearchComponent} from './search/search.component';
import {NewRequestComponent} from './new-request/new-request.component';
import {FsMenuComponent} from './fs-menu/fs-menu.component';
import {AppPropertiesService, PROPERTIES_APP_NAME, PROPERTIES_OVERRIDE} from './service/app-properties.service';
import {environment} from 'src/environments/environment';
import {SearchResultComponent} from './search/search-result/search-result.component';
import {UnauthorizeComponent} from './unauthorize/unauthorize.component';
import {StepIndicatorComponent} from './funding-request/step-indicator/step-indicator.component';
import {FundingRequestComponent} from './funding-request/funding-request.component';
import {Step1Component} from './funding-request/step1/step1.component';
import {Step3Component} from './funding-request/step3/step3.component';
import {Step2Component} from './funding-request/step2/step2.component';
import {Step4Component} from './funding-request/step4/step4.component';
import {DataTablesModule} from 'angular-datatables';
import {FormatNcabDatePipe} from './pipes/format-ncab-date.pipe';
import {AppLookupsService} from './service/app-lookups.service';
import {CodeDescriptionPipe} from './pipes/code-description.pipe';
import {RequestModel} from './model/request-model';
import {PlanModel} from './model/plan-model';
import {AppUserSessionService} from './service/app-user-session.service';
import { MailtoFormatterPipe } from './pipes/mailto-formatter.pipe';
import { GrantInformationComponent } from './grant-information/grant-information.component';
import { ProgramRecommendedCostsComponent } from './program-recommended-costs/program-recommended-costs.component';
import { RequestInformationComponent } from './request-information/request-information.component';
import { RequestInformationReadonlyComponent } from './request-information-readonly/request-information-readonly.component';
import { RequestHistoryComponent } from './request-history/request-history.component';
import { NextScheduledApproversRequestReadonlyComponent } from './next-scheduled-approvers-request-readonly/next-scheduled-approvers-request-readonly.component';
import { ProgramRecommendedCostsReadonlyComponent } from './program-recommended-costs-readonly/program-recommended-costs-readonly.component';
import { NextScheduledApproversRequestComponent } from './next-scheduled-approvers-request/next-scheduled-approvers-request.component';
import { FundingSourceComponent } from './funding-source/funding-source.component';
import { OtherDocsContributingFundsComponent } from './other-docs-contributing-funds/other-docs-contributing-funds.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LoaderSpinnerComponent } from './loader-spinner/loader-spinner.component';
import { LoaderService } from './service/loader-spinner.service';
import { LoaderInterceptor } from './interceptors/loader-spinner.interceptor';
import { FundingSourcesNamesComponent } from './funding-sources-names/funding-sources-names.component';

export function initializeAppProperties(appPropertiesService: AppPropertiesService,
                                        appLookupsService: AppLookupsService,
                                        appUserSessionService: AppUserSessionService) {
  return (): Promise<any> => {
    // add async loading proerties and other initialization functions below.
    // calling rest api to load application properties and override properties
    return appInitialization(appPropertiesService,
      appLookupsService, appUserSessionService);
  };
}

async function appInitialization(
  appPropertiesService: AppPropertiesService,
  appLookupsService: AppLookupsService,
  appUserSessionService: AppUserSessionService) {
  appPropertiesService.initialize();
  appLookupsService.initialize();
  appUserSessionService.initialize();
}

@NgModule({
  declarations: [
    AppComponent,
    SearchFilterComponent,
    FundingRequestTypeComponent,
    SearchPoolComponent,
    HeaderComponent,
    SearchComponent,
    NewRequestComponent,
    FsMenuComponent,
    SearchResultComponent,
    UnauthorizeComponent,
    StepIndicatorComponent,
    FundingRequestComponent,
    Step1Component,
    Step3Component,
    Step2Component,
    Step4Component,
    FormatNcabDatePipe,
    CodeDescriptionPipe,
    MailtoFormatterPipe,
    GrantInformationComponent,
    ProgramRecommendedCostsComponent,
    RequestInformationComponent,
    RequestInformationReadonlyComponent,
    RequestHistoryComponent,
    NextScheduledApproversRequestReadonlyComponent,
    ProgramRecommendedCostsReadonlyComponent,
    NextScheduledApproversRequestComponent,
    FundingSourceComponent,
    OtherDocsContributingFundsComponent,
    LoaderSpinnerComponent,
    FundingSourcesNamesComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    I2ecuiLibModule,
    ApiModule,
    HttpClientModule,
    NgSelect2Module,
    NgbModule,
    FormsModule,
    DataTablesModule,
    DragDropModule
  ],
  providers: [RequestModel, PlanModel,LoaderService,
    {provide: BASE_PATH, useValue: '/i2ecws'},
    {provide: PROPERTIES_APP_NAME, useValue: 'FUNDING-SELECTIONS'},
    {provide: PROPERTIES_OVERRIDE, useValue: environment},
    {
      provide: APP_INITIALIZER, useFactory: initializeAppProperties,
      deps: [AppPropertiesService, AppLookupsService,
        AppUserSessionService], multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
