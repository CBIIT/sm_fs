import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FundingSubmBulkEditFieldsDto, FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-grant-detail',
  templateUrl: './grant-detail.component.html',
  styleUrls: ['./grant-detail.component.css']
})
export class GrantDetailComponent implements OnInit {
  @Input() data: any = null;
  @Input() listId: number;
  @Output() close = new EventEmitter<void>();

  isEditMode = false;
  grantViewerUrl = '';

  formModel: FundingSubmBulkEditFieldsDto & { nciDecision?: string; justificationText?: string } = {};
  justificationFile: File | null = null;

  decisionOptions: Select2OptionData[] = [
    { id: 'Fund',      text: 'Fund' },
    { id: 'Defer',     text: 'Defer' },
    { id: 'Delete',    text: 'Delete' },
    { id: 'Withdrawn', text: 'Withdrawn' },
    { id: 'Not Fund',  text: 'Not Fund' },
  ];
  priorityOptions: Select2OptionData[] = [
    { id: 'High',   text: 'High' },
    { id: 'Medium', text: 'Medium' },
    { id: 'Low',    text: 'Low' },
  ];
  yesNoOptions: Select2OptionData[] = [
    { id: 'Yes', text: 'Yes' },
    { id: 'No',  text: 'No' },
  ];
  annualMyfOptions: Select2OptionData[] = [
    { id: 'Annual',            text: 'Annual' },
    { id: 'Multi-Year Funding', text: 'Multi-Year Funding' },
  ];
  budgetCategoryOptions: Select2OptionData[] = [
    { id: 'R01/R37', text: 'R01/R37' },
    { id: 'R03',     text: 'R03' },
    { id: 'R21',     text: 'R21' },
    { id: 'R37',     text: 'R37' },
    { id: 'U54',     text: 'U54' },
  ];
  selectionOptions: Select2OptionData[] = [
    { id: 'Fund',   text: 'Fund' },
    { id: 'Defer',  text: 'Defer' },
    { id: 'Delete', text: 'Delete' },
  ];

  constructor(
    private logger: NGXLogger,
    private fundingSubmissionsService: FundingSubmissionsControllerService,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  }

  onEdit(): void {
    this.formModel = {
      nciDecision:        this.data?.nciDecision ?? '',
      docDecision:        this.data?.docDecision ?? '',
      docPriority:        this.data?.docPriority ?? '',
      docRecAmt:          this.data?.docRecAmt ?? null,
      docRecReductionPct: this.data?.docRecPctRed ?? null,
      docNciSelection:    this.data?.docNciSel ?? '',
      annualFundingR01:   this.data?.twoYrFunding ?? '',
      budgetCategories:   this.data?.budgetCategory ?? '',
      docNotes:           this.data?.docNotes ?? '',
      oefiaNotes:         this.data?.oefiaNote ?? '',
      annualOrMyf:        this.data?.annualOrMyf ?? '',
      justificationText:  this.data?.justificationText ?? '',
    };
    this.justificationFile = null;
    this.isEditMode = true;
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFile = null;
    this.cdr.detectChanges();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.justificationFile = input.files?.[0] ?? null;
  }

  onSave(): void {
    this.logger.debug('GrantDetailComponent onSave()', this.formModel, 'listId:', this.listId);
    const { nciDecision, justificationText, ...fields } = this.formModel;

    this.fundingSubmissionsService.bulkUpdateListGrants(
      { applIds: [this.data.applId], fields },
      this.listId
    ).subscribe({
      next: () => {
        this.logger.debug('Grant detail saved');
        this.applyFormModelToData(nciDecision);
        if (justificationText || this.justificationFile) {
          this.saveJustification(justificationText);
        } else {
          this.isEditMode = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => this.logger.error('Grant detail save error', err)
    });
  }

  private saveJustification(justificationText: string): void {
    this.fundingSubmissionsService.saveJustificationForm(
      this.listId, this.data.applId, this.justificationFile ?? undefined, justificationText
    ).subscribe({
      next: () => {
        this.data.justificationText = justificationText;
        this.isEditMode = false;
        this.cdr.detectChanges();
      },
      error: (err) => this.logger.error('Justification save error', err)
    });
  }

  private applyFormModelToData(nciDecision: string): void {
    this.data.nciDecision       = nciDecision;
    this.data.docDecision       = this.formModel.docDecision;
    this.data.docPriority       = this.formModel.docPriority;
    this.data.docRecAmt         = this.formModel.docRecAmt;
    this.data.docRecPctRed      = this.formModel.docRecReductionPct;
    this.data.docNciSel         = this.formModel.docNciSelection;
    this.data.twoYrFunding      = this.formModel.annualFundingR01;
    this.data.budgetCategory    = this.formModel.budgetCategories;
    this.data.docNotes          = this.formModel.docNotes;
    this.data.oefiaNote         = this.formModel.oefiaNotes;
    this.data.annualOrMyf       = this.formModel.annualOrMyf;
  }
}
