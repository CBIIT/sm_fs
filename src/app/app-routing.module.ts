import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewRequestComponent } from './new-request/new-request.component';
import { SearchComponent } from './search/search.component';
import { UnauthorizeComponent } from './unauthorize/unauthorize.component';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  {
    path: '', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: '/search', pathMatch: 'full' },
      { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
      { path: 'newrequest', component: NewRequestComponent },
      { path: 'newplan', component: NewRequestComponent }
    ]
  },
  { path: 'unauthorize', component: UnauthorizeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

