import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';

@Component({
  selector: 'app-retrieve-request',
  templateUrl: './retrieve-request.component.html',
  styleUrls: ['./retrieve-request.component.css']
})
export class RetrieveRequestComponent implements OnInit {
  frqId: number;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private requestModel: RequestModel,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    this.frqId = this.route.snapshot.params.frqId;
    this.logger.debug('retrieving request frqId = ' + this.frqId);
    this.router.navigate(['/request/step4']);
  }

}
