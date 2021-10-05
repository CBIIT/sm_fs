import {Component, Input, OnInit} from '@angular/core';
import {ControlContainer, NgForm} from "@angular/forms";
import {CancerActivityControllerService} from "@nci-cbiit/i2ecws-lib";
import {Select2OptionData} from "ng-select2";

@Component({
  selector: 'app-search-rfa-pa-dropdown',
  templateUrl: './app-search-rfa-pa-dropdown.component.html',
  styleUrls: ['./app-search-rfa-pa-dropdown.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class AppSearchRfaPaDropdownComponent implements OnInit {

  constructor(private caService: CancerActivityControllerService) { }

  @Input()
  parentForm: NgForm; // optional

  public rfaPas: Array<Select2OptionData>;

  ngOnInit(): void {
    this.caService.getRfaPaNoticesListUsingGET().subscribe(
      result => {
        const rfapaResults: Array<Select2OptionData> = [];
        for (const entry of result) {
          rfapaResults.push({
            id: entry.noticeNumber, text: entry.noticeNumber
          });
        }
        this.rfaPas = rfapaResults;
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
        alert('HttpClient get request error for----- ' + error.message);  //TODO error handling
      });
  }

}
