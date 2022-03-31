import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { ControlContainer, NgForm, NgModel } from "@angular/forms";
import { Select2OptionData } from "ng-select2";
import { Options } from "select2";
import { NGXLogger } from "ngx-logger";
import { openNewWindow } from "../../../utils/utils";
import { FsLookupControllerService } from "@cbiit/i2ecws-lib";
import { SearchFundingRequestTypesDto } from "@cbiit/i2ecws-lib/model/searchFundingRequestTypesDto";

@Component({
  selector: 'app-search-funding-request-type',
  templateUrl: './search-funding-request-type.component.html',
  styleUrls: ['./search-funding-request-type.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchFundingRequestTypeComponent implements OnInit, AfterViewInit {

  @Input() required: boolean;
  @Input() parentForm: NgForm; // optional parent form to validate on submit

  @ViewChild('fundingRequestType') frTypeControl: NgModel
  @ViewChild('frTypes') frTypes: NgModel

  selectionMap: Map<string, string[]> = new Map<string, string[]>();
  requestTypes: SearchFundingRequestTypesDto[] = [];
  data: Array<Select2OptionData>;
  options: Options;

  constructor(private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService) { }

  ngAfterViewInit(): void {
    this.logger.debug('formControl root', this.frTypeControl.control.root);
    // while (form && form instanceof NgForm) {
    //   // form = this.frTypeControl.;
    // }
  }

  ngOnInit(): void {
    this.options = {
    };

    this.fsLookupControllerService.getSearchRequestTypesUsingGET().subscribe(
      result => {
        this.requestTypes = result;
        this.prepareData(this.requestTypes);
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  openPdfDoc(): boolean {
    openNewWindow('assets/docs/Request Type Definitions.pdf', 'Request_Type_Description');
    return false;
  }

  /**
   * Extract list of selectable items for funding request search dropdown
   * For each selection, define an array of type IDs to pass into search criteria
   * @param list
   */
  prepareData(list: SearchFundingRequestTypesDto[]): void {

    this.selectionMap.clear();
    const selectionData = new Array<Select2OptionData>();

    // Create a list of selectable items
    list.forEach(t => {
      if (t.parentFrtId === null) {  // selectable item - do not include in searchable if parentCategoryFlag is set
        this.selectionMap.set(String(t.id), (t.parentCategoryFlag) ? [] : [String(t.id)]);
        selectionData.push({
          id: String(t.id), text: t.requestTypeName
        })
      }
    });

    // Add the rest of types into searchable arrays
    // Do not add intermediat parents (with parent_category_flag set
    list.forEach(t => {
      if (t.parentFrtId && !t.parentCategoryFlag) {
        // find the selectable item
        const parent = _getParent(t, list);
        this.selectionMap.get(String(parent.id)).push(String(t.id));
      }
    });

    this.data = selectionData;

    // Recursive function to get the top parent
    function _getParent(t: SearchFundingRequestTypesDto, list: SearchFundingRequestTypesDto[]): SearchFundingRequestTypesDto {
      if (t.parentFrtId) {
        for (const entry of list) {
          if (entry.id === t.parentFrtId) {
            return _getParent(entry, list);
          }
        }
      }
      return t;
    }

  }

  onSelect($event: any) {
    this.logger.debug('onfrTypeSelect', $event);
    let val: string[] = [];
    if ($event && this.selectionMap.has($event)) {
      val = this.selectionMap.get($event);
    }
    this.logger.debug('onfrTypeSelect - set value', val);
    this.frTypes.control.setValue(val);
  }
}
