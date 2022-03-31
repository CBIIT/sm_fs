import { AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { DataTableDirective } from 'angular-datatables';
import {
  FullGrantNumberCellRendererComponent
} from 'src/app/table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import {
  CancerActivityCellRendererComponent
} from 'src/app/table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import {
  ExistingRequestsCellRendererComponent
} from 'src/app/table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component';
import { Subject } from 'rxjs';
import { PlanModel } from 'src/app/model/plan/plan-model';

@Component({
  selector: 'app-docs-grant-table',
  templateUrl: './docs-grant-table.component.html',
  styleUrls: ['./docs-grant-table.component.css']
})
export class DocsGrantTableComponent implements OnInit, AfterViewInit {

  private _grantList: NciPfrGrantQueryDtoEx[] = [];
  private _minScore: number;
  private _maxScore: number;

  get grantList(): NciPfrGrantQueryDtoEx[] {
    return this._grantList;
  }

  get minScore(): number {
    return this._minScore;
  }

  get maxScore(): number {
    return this._maxScore;
  }

  @Input()
  set grantList(val: NciPfrGrantQueryDtoEx[]) {
    // TODO process event
    this._grantList = val;
    if (this.dtOptions) {
      this.dtOptions.data = this._grantList;
    }
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
  }

  // Need min and max score to determine "Skip" and "Exception"
  @Input()
  set minScore(val: number) {
    // TODO process event
    this._minScore = val;
  }

  @Input()
  set maxScore(val: number) {
    // TODO process event
    this._maxScore = val;
  }

  grantViewerUrl: string = this.planModel.grantViewerUrl;
  eGrantsUrl: string = this.planModel.eGrantsUrl;

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existingRequestsRenderer') existingRequestsRenderer: TemplateRef<ExistingRequestsCellRendererComponent>;

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};

  constructor(private planModel: PlanModel) {
  }

  get noResult(): boolean {
    return !this._grantList || this._grantList.length === 0;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      paging: false,
      data: this._grantList,
      columns: [
        {title: 'Grant Number', data: 'fullGrantNum', // 0
            ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'},
        {title: 'PI', data: 'piFullName', // 1
            render: ( data, type, row, meta ) => {
              return '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
            },
            className: 'all'},
        {title: 'Project Title', data: 'projectTitle'}, // 2
        {title: 'FOA', data: 'rfaPaNumber', // 3
            render: ( data, type, row, meta ) => {
              return '<a href="' + row.nihGuideAddr + '" target="_blank" >' + data + '</a>';
            }},
        
        {title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', // 8
            render: ( data, type, row, meta) => {
              return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
            }},
       
        {title: 'Pri Scr', data: 'priorityScoreNum'}, // 10
       
        {data: null, defaultContent: ''}
      ],
      order: [[5, 'asc']],
      responsive: {
        details: {
          type: 'column',
          target: -1
        }
      },
      columnDefs: [
        {
          className: 'control',
          orderable: false,
          targets: -1
        },
        
      ],
      dom: '<"dt-controls"<"ml-auto"fB<"d-inline-block">>>rt<"dt-controls"<"mr-auto"i>>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-fp-grants-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [ 0, 1, 2, 3 , 4 , 5] }
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
       
        this.dtOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    setTimeout(() => this.dtTrigger.next(), 0);
  }

}
