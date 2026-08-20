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
  justificationFileError: string | null = null;

  // Client-side validation constants — mirror FsubJustificationConstants (sm_i2e_fs_ws)
  private readonly MAX_JUSTIFICATION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, mirrors FsubJustificationConstants.MAX_FILE_SIZE_BYTES
  private readonly ALLOWED_JUSTIFICATION_FILE_EXTENSIONS = ['doc', 'docx', 'rtf', 'xls', 'xlsx', 'pdf']; // mirrors FsubJustificationConstants.ALLOWED_FILE_EXTENSIONS

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
      docRecAmt:          this.data?.docRecommendedAmount ?? null,
      docRecReductionPct: this.data?.docRecommendedReductionPct ?? null,
      docNciSelection:    this.data?.docNciSelection ?? '',
      annualFundingR01:   this.data?.twoYearAnnualFundingR01Flag ?? '',
      budgetCategories:   this.data?.budgetCategories ?? '',
      docNotes:           this.data?.docNotes ?? '',
      oefiaNotes:         this.data?.oefiaNote ?? '',
      annualOrMyf:        this.data?.annualOrMyf ?? '',
      justificationText:  this.data?.justificationText ?? '',
    };
    this.justificationFile = null;
    this.justificationFileError = null;
    this.isEditMode = true;
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFile = null;
    this.justificationFileError = null;
    this.cdr.detectChanges();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.justificationFile = null;
      this.justificationFileError = null;
      this.cdr.detectChanges();
      return;
    }

    // Validate file extension (case-insensitive)
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop()!.toLowerCase() : '';
    if (!this.ALLOWED_JUSTIFICATION_FILE_EXTENSIONS.includes(fileExtension)) {
      this.justificationFileError = 'Unsupported file type. Allowed types: Word, RTF, Excel, PDF.';
      this.justificationFile = null;
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_JUSTIFICATION_FILE_SIZE_BYTES) {
      this.justificationFileError = 'File exceeds the 10 MB size limit.';
      this.justificationFile = null;
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Valid file
    this.justificationFileError = null;
    this.justificationFile = file;
    this.cdr.detectChanges();
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
    this.data.nciDecision                 = nciDecision;
    this.data.docDecision                 = this.formModel.docDecision;
    this.data.docPriority                 = this.formModel.docPriority;
    this.data.docRecommendedAmount        = this.formModel.docRecAmt;
    this.data.docRecommendedReductionPct  = this.formModel.docRecReductionPct;
    this.data.docNciSelection             = this.formModel.docNciSelection;
    this.data.twoYearAnnualFundingR01Flag = this.formModel.annualFundingR01;
    this.data.budgetCategories            = this.formModel.budgetCategories;
    this.data.docNotes                    = this.formModel.docNotes;
    this.data.oefiaNote                   = this.formModel.oefiaNotes;
    this.data.annualOrMyf                 = this.formModel.annualOrMyf;
  }
}
