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
import { ReviewRequestComponent } from './funding-request/review-request/review-request.component';

const routes: Routes = [
  {
    path: '', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: '/search', pathMatch: 'full' },
      { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'plan', component: FundingPlanComponent },
      { path: 'request', component: FundingRequestComponent, children: [
        {path: '', redirectTo: 'step1', pathMatch: 'full'},
        {path: 'step1', component: Step1Component, canActivate: [PdAuthGuard]},
        {path: 'step2', component: Step2Component},
        {path: 'step3', component: Step3Component},
        {path: 'step4', component: Step4Component},
        {path: 'review', component: ReviewRequestComponent},
        {path: 'retrieve/:frqId', component: RetrieveRequestComponent}
      ]},
      {path: 'fundingSourceDetails', component: FundingSourcesNamesComponent},

    ]
  },
  { path: 'unauthorize', component: UnauthorizeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

