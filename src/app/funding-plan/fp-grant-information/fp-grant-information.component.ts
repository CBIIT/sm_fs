import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';

@Component({
  selector: 'app-fp-grant-information',
  templateUrl: './fp-grant-information.component.html',
  styleUrls: ['./fp-grant-information.component.css']
})
export class FpGrantInformationComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() index: number;

  constructor() { }

  ngOnInit(): void {
  }

}
