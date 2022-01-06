import {Component, Input, OnInit} from '@angular/core';
import {ControlContainer, NgForm} from '@angular/forms';
import {CancerActivityControllerService} from '@nci-cbiit/i2ecws-lib';
import {Select2OptionData} from 'ng-select2';
import {Options} from 'select2';

@Component({
  selector: 'app-search-rfa-pa-dropdown',
  templateUrl: './search-rfa-pa-dropdown.component.html',
  styleUrls: ['./search-rfa-pa-dropdown.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchRfaPaDropdownComponent implements OnInit {

  constructor(private caService: CancerActivityControllerService) { }

  @Input()
  parentForm: NgForm; // optional

  data: Array<Select2OptionData>;
  options: Options = {};

  ngOnInit(): void {
    this.caService.getRfaPaNoticesListUsingGET().subscribe(
      result => {
        const rfapaResults: Array<Select2OptionData> = [];
        for (const entry of result) {
          rfapaResults.push({
            id: entry.noticeNumber, text: entry.noticeNumber
          });
        }
        this.data = rfapaResults;
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });
  }
}
