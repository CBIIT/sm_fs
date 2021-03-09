import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewRequestComponent } from './new-request/new-request.component';
import { SearchComponent } from './search/search.component';


const routes: Routes = [
  {path: '', component: SearchComponent},
  {path: 'search', component: SearchComponent},
  {path: 'newrequest', component: NewRequestComponent}
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 

