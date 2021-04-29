import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewRequestComponent } from './new-request/new-request.component';
import { SearchComponent } from './search/search.component';
import { UnauthorizeComponent } from './unauthorize/unauthorize.component';
import { AuthGuard } from './auth/auth.guard';
import { FundingRequestComponent } from './funding-request/funding-request.component';
import { Step1Component } from './funding-request/step1/step1.component';
import { Step2Component } from './funding-request/step2/step2.component';
import { Step3Component } from './funding-request/step3/step3.component';
import { Step4Component } from './funding-request/step4/step4.component';

const routes: Routes = [
  {
    path: '', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: '/search', pathMatch: 'full' },
      { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'newplan', component: NewRequestComponent },
      { path: 'request', component: FundingRequestComponent, children:[
        {path: '', redirectTo: 'step1', pathMatch: 'full'},
        {path: 'step1', component: Step1Component},
        {path: 'step2', component: Step2Component},
        {path: 'step3', component: Step3Component},
        {path: 'step4', component: Step4Component}
      ]}
    ]
  },
  { path: 'unauthorize', component: UnauthorizeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

