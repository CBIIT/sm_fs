import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { LookupsControllerService } from '@cbiit/i2ecws-lib';
import { Options } from 'select2';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NGXLogger } from 'ngx-logger';
import { PdCaIntegratorService } from '@cbiit/i2ecui-lib';


class DocData {
  id: number;
  abbreviation: string;
  description: string;
  selected: boolean;
  order: number;
}

@Component({
  selector: 'app-other-docs-contributing-funds',
  templateUrl: './other-docs-contributing-funds.component.html',
  styleUrls: ['./other-docs-contributing-funds.component.css'],
})
export class OtherDocsContributingFundsComponent implements OnInit {

  selectedDocsArr: Array<DocData> = new Array<DocData>();
  private _selectedValue: string;
  private pdDoc: string;

  public docs: Array<DocData> = new Array<DocData>()
  public options: Options;

  @Input() preSelectedDocs = '';

  @Input() label = 'Division/Office/Center (DOC)';

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  set selectedValue(value: string) {
    this.docs.forEach(d => {
      if (String(d.abbreviation) === String(value)) {
        d.selected = true;
        if (!this.selectedDocsArr.includes(d)) {
          this.selectedDocsArr.push(d);
        }
      }
    });
    this._selectedValue = this.getSelectionString();
    this.updateRequestModel();
  }

  private updateRequestModel(): void {
    this.requestModel.requestDto.otherDocsText = this._selectedValue;
    this.requestModel.requestDto.financialInfoDto.otherDocText = this._selectedValue;
    if (this._selectedValue) {
      this.requestModel.requestDto.otherDocsFlag = 'Y';
      this.requestModel.requestDto.financialInfoDto.otherDocFlag = 'Y';
    } else {
      this.requestModel.requestDto.otherDocsFlag = undefined;
      this.requestModel.requestDto.financialInfoDto.otherDocFlag = undefined;
    }
  }

  constructor(
    private lookupsControllerService: LookupsControllerService,
    private requestModel: RequestModel,
    private logger: NGXLogger,
    private pdCaIntegratorSvc: PdCaIntegratorService) {
  }

  ngOnInit(): void {
    this.initializeDocs();
    this.pdCaIntegratorSvc.docEmitter.subscribe(next => {
      if (next) {
        this.pdDoc = next;
        if (this.selectedDocsArr.map(d => d.abbreviation).includes(next)) {
          this.deselect(next);
        }
      } else {
        this.pdDoc = null;
      }
    });
  }

  initializeDocs(): void {
    this.options = {};
    this.docs = new Array<DocData>();

    const selectedDocs = this.preSelectedDocs || '';

    this.lookupsControllerService.getNciDocs().subscribe(
      result => {
        result.forEach(r => {
          const tmp = {
            selected: false,
            id: r.id,
            abbreviation: r.abbreviation,
            description: r.description,
            order: 0
          };
          this.docs.push(tmp);
        });
        if (selectedDocs) {
          selectedDocs.split(',').forEach(s => {
            this.selectedValue = s;
          });
        }

      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });
  }

  availableDocs(): Array<DocData> {
    return this.docs.filter(d => !d.selected && !(d.abbreviation === this.pdDoc));
  }

  selectedDocs(): Array<DocData> {
    return this.selectedDocsArr;
  }


  deselect(abbreviation: string): void {
    this.docs.forEach(d => {
      if (d.abbreviation === abbreviation) {
        d.selected = false;
      }
    });
    let i = 0;
    let j = 0;
    this.selectedDocsArr.forEach(d => {
      if (d.abbreviation === abbreviation) {
        j = i;
      }
      i++;
    });

    this.selectedDocsArr.splice(j, 1);
    this._selectedValue = this.getSelectionString();
    this.updateRequestModel();
  }

  getSelectionString(): string {
    const dox = this.selectedDocsArr.map(d => d.abbreviation);
    if (!dox || dox.length === 0) {
      return '';
    }

    return dox.join();
  }

  dropped(event: CdkDragDrop<DocData[]>): void {
    moveItemInArray(this.selectedDocsArr, event.previousIndex, event.currentIndex);
    this._selectedValue = this.getSelectionString();
    this.updateRequestModel();
    this.selectedValueChange.emit(this.getSelectionString());
  }

  tooltip(): string {
    if (this.selectedDocsArr?.length > 1) {
      return 'Drag & Drop to Order';
    }
    return null;
  }
}
