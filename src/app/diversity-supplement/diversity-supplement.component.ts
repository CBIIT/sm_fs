import { Component, OnInit } from '@angular/core';
import {RequestModel} from '../model/request-model';
import {ControlContainer, NgForm} from '@angular/forms';

@Component({
  selector: 'app-diversity-supplement',
  templateUrl: './diversity-supplement.component.html',
  styleUrls: ['./diversity-supplement.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class DiversitySupplementComponent implements OnInit {

  constructor(public requestModel: RequestModel) { }

  ngOnInit(): void {
  }

}
