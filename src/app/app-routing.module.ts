import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FundingPlanComponent } from './funding-plan/funding-plan.component';
import { SearchComponent } from './search/search.component';
import { UnauthorizeComponent } from './unauthorize/unauthorize.component';
import { AuthGuard } from './auth/auth.guard';
import { FundingRequestComponent } from './funding-request/funding-request.component';
import { Step1Component } from './funding-request/step1/step1.component';
import { Step2Component } from './funding-request/step2/step2.component';
import { Step3Component } from './funding-request/step3/step3.component';
import { Step4Component } from './funding-request/step4/step4.component';
import { PdAuthGuard } from './funding-request/step1/pd.auth.guard';
import { FundingSourcesNamesComponent } from './funding-sources-names/funding-sources-names.component';
import { RetrieveRequestComponent } from './funding-request/retrieve-request/retrieve-request.component';
import { PlanStep1Component } from './funding-plan/plan-step1/plan-step1.component';
import { PlanStep2Component } from './funding-plan/plan-step2/plan-step2.component';
import { PlanStep3Component } from './funding-plan/plan-step3/plan-step3.component';
import { PlanStep4Component } from './funding-plan/plan-step4/plan-step4.component';
import { PlanStep5Component } from './funding-plan/plan-step5/plan-step5.component';
import { PlanStep6Component } from './funding-plan/plan-step6/plan-step6.component';
import {CanDeactivatePlanStep1} from './funding-plan/plan-step1/can-deactivate-plan-step1';
import {ManageDesignationsComponent} from './manage-designations/manage-designations.component';
import { RetrievePlanComponent } from './funding-plan/retrieve-plan/retrieve-plan.component';
import { CanDeactivatePlanStep6 } from './funding-plan/plan-step6/can-deactivate-plan-step6';
import { CanDeactivateRequestStep2 } from './funding-request/step2/can-deactivate-request-step2';
import { CanDeactivatePlanStep3 } from './funding-plan/plan-step3/can-deactivate-plan-step3';
import { ErrorComponent } from './error/error/error.component';
import { SessionRestoreComponent } from './session/session-restore/session-restore.component';

const routes: Routes = [
  {
    path: '', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: '/search/fr/landing', pathMatch: 'full' },
      { path: 'search/fr/:action', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'search/fr', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'search/fp', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'search/grants', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'search/:action', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'plan', component: FundingPlanComponent, children: [
        {path: '', redirectTo: 'step1/new', pathMatch: 'full'},
        {path: 'step1', redirectTo: 'step1/', pathMatch: 'full'},
        {path: 'step1/:new', component: PlanStep1Component, canDeactivate: [CanDeactivatePlanStep1], canActivate: [PdAuthGuard]},
        {path: 'step2', component: PlanStep2Component},
        {path: 'step3', component: PlanStep3Component, canDeactivate: [CanDeactivatePlanStep3]},
        {path: 'step4', component: PlanStep4Component},
        {path: 'step5', component: PlanStep5Component},
        {path: 'step6', component: PlanStep6Component, canDeactivate: [CanDeactivatePlanStep6]},
        {path: 'retrieve/:fprId', component: RetrievePlanComponent}
      ]},
      { path: 'request', component: FundingRequestComponent, children: [
        {path: '', redirectTo: 'step1/new', pathMatch: 'full'},
        {path: 'step1', redirectTo: 'step1/', pathMatch: 'full'},
        {path: 'step1/:new', component: Step1Component, canActivate: [PdAuthGuard]},
        {path: 'step2', component: Step2Component, canDeactivate: [CanDeactivateRequestStep2]},
        {path: 'step3', component: Step3Component},
        {path: 'step4', component: Step4Component},
        {path: 'retrieve/:frqId', component: RetrieveRequestComponent}
      ]},
      {path: 'fundingSourceDetails', component: FundingSourcesNamesComponent},
      {path: 'manage', component: ManageDesignationsComponent},
      { path: 'restoreSession', component: SessionRestoreComponent, canActivate: [AuthGuard] }
    ]
  },
  { path: 'error/:errorId', component: ErrorComponent },
  { path: 'unauthorize', component: UnauthorizeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

