import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-cancer-activity-cell-renderer',
  templateUrl: './cancer-activity-cell-renderer.component.html',
  styleUrls: ['./cancer-activity-cell-renderer.component.css']
})
export class CancerActivityCellRendererComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Input()
  data : any = {}
}
