import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiModule, BASE_PATH } from 'i2ecws-lib';
import { HttpClientModule } from '@angular/common/http';
import { NgSelect2Module } from 'ng-select2';
import { I2ecuiLibModule } from 'i2ecui-lib';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    I2ecuiLibModule,
    ApiModule,
    HttpClientModule,
    NgSelect2Module
  ],
  providers: [{provide: BASE_PATH, useValue: '/i2ecws'}],
  bootstrap: [AppComponent]
})
export class AppModule { }
