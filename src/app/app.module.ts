import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiModule, BASE_PATH } from 'i2ecws-lib';
import { HttpClientModule } from '@angular/common/http';
import { NgSelect2Module } from 'ng-select2';
import { I2ecuiLibModule } from 'i2ecui-lib';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchFilterComponent } from './search/search-filter/search-filter.component';
import { FundingRequestTypeComponent } from './search/search-filter/funding-request-type/funding-request-type.component';
import { SearchPoolComponent } from './search/search-filter/search-pool/search-pool.component';

@NgModule({
  declarations: [
    AppComponent,
    SearchFilterComponent,
    FundingRequestTypeComponent,
    SearchPoolComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    I2ecuiLibModule,
    ApiModule,
    HttpClientModule,
    NgSelect2Module,
    NgbModule,
    FormsModule
  ],
  providers: [{provide: BASE_PATH, useValue: '/i2ecws'}],
  bootstrap: [AppComponent]
})
export class AppModule { }
