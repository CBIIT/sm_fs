import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {FsLookupControllerService} from '@cbiit/i2ecws-lib';
import {ControlContainer, NgForm, NgModel} from '@angular/forms';
import {Select2OptionData} from 'ng-select2';
import {Options} from 'select2';

@Component({
  selector: 'app-search-funding-request-apprvl-role',
  templateUrl: './search-funding-request-apprvl-role.component.html',
  styleUrls: ['./search-funding-request-apprvl-role.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchFundingRequestApprvlRoleComponent implements OnInit {

  @Input() required = false;
  @Input() form: NgForm; // optional parent form to validate on submit
  @Input() label = 'Pending Approval From';
  @Input() name = 'approval-role';

  @ViewChild('approvalRole') approvalRoleControl: NgModel;

  data: Array<Select2OptionData> = [];
  options: Options = {};

  constructor(private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService) { }

  ngOnInit(): void {
    this.fsLookupControllerService.getReqApproverRolesUsingGET().subscribe(
      result => {
        const dropdownList: Array<Select2OptionData> = [];
        for (const entry of result) {
          dropdownList.push({
            id: entry.roleCode, text: entry.roleName
          });
        }
        this.data = dropdownList;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
    });
  }
}
