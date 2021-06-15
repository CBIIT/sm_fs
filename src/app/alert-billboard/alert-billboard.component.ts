import {Component, Input, OnInit} from '@angular/core';
import {Alert} from '../service/alert';
import {AlertService} from '../service/alert.service';

@Component({
  selector: 'app-alert-billboard',
  templateUrl: './alert-billboard.component.html',
  styleUrls: ['./alert-billboard.component.css']
})
export class AlertBillboardComponent implements OnInit {
  @Input() alert: Alert;

  constructor(public alertService: AlertService) {
  }

  ngOnInit(): void {
  }

}
