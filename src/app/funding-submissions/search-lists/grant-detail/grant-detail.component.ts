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

  formModel: FundingSubmBulkEditFieldsDto & { justificationText?: string } = {};
  justificationFile: File | null = null;
  justificationFileError: string | null = null;
  saveSuccessMessage = '';
  saveValidationError: string | null = null;

  // Client-side validation constants — mirror FsubJustificationConstants (sm_i2e_fs_ws)
  private readonly MAX_JUSTIFICATION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, mirrors FsubJustificationConstants.MAX_FILE_SIZE_BYTES
  private readonly ALLOWED_JUSTIFICATION_FILE_EXTENSIONS = ['doc', 'docx', 'rtf', 'xls', 'xlsx', 'pdf']; // mirrors FsubJustificationConstants.ALLOWED_FILE_EXTENSIONS

  decisionOptions: Select2OptionData[] = [
    { id: 'Pay', text: 'Pay' },
    { id: 'Do Not Pay', text: 'Do Not Pay' },
  ];
  yesNoOptions: Select2OptionData[] = [
    { id: 'Yes', text: 'Yes' },
    { id: 'No', text: 'No' },
  ];
  // Select2 `id` is the value sent/stored ("AF"/"MYF", matching the backend's
  // FUNDING_SUBM_LIST_GRANTS_T.MYF_OR_AF_CODE short-code convention); `text` is the
  // full display label shown to the user.
  annualMyfOptions: Select2OptionData[] = [
    { id: 'AF',  text: 'Annual Funding (AF)' },
    { id: 'MYF', text: 'Multi-year Funding (MYF)' },
  ];
  budgetCategoryOptions: Select2OptionData[] = [
    { id: 'DOC & OD', text: 'DOC & OD' },
    { id: 'ESI R37 T4', text: 'ESI R37 T4' },
    { id: 'MISC', text: 'MISC' },
    { id: 'Other R01', text: 'Other R01' },
    { id: 'P01', text: 'P01' },
    { id: "PAR U's", text: "PAR U's" },
    { id: 'R34/U34', text: 'R34/U34' },
    { id: 'R50', text: 'R50' },
    { id: 'RFA', text: 'RFA' },
  ];
  selectionOptions: Select2OptionData[] = [
    { id: 'DOC Selection', text: 'DOC Selection' },
    { id: 'NCI Selection', text: 'NCI Selection' },
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
      docDecision:        this.data?.docDecision ?? null,
      docPriority:        this.data?.docPriority ?? null,
      docRecAmt:          this.data?.docRecommendedAmount ?? null,
      docRecReductionPct: this.data?.docRecommendedReductionPct ?? null,
      docNciSelection:    this.data?.docNciSelection ?? null,
      annualFundingR01:   this.data ? (this.data.twoYearAnnualFundingR01Flag ? 'Yes' : 'No') : null,
      budgetCategories:   this.data?.budgetCategories ?? null,
      docNotes:           this.data?.docNotes ?? '',
      oefiaNotes:         this.data?.oefiaNotes ?? '',
      annualOrMyf:        this.data?.annualOrMyf ?? null,
      justificationText:  this.data?.justificationText ?? '',
    };
    this.justificationFile = null;
    this.justificationFileError = null;
    this.saveSuccessMessage = '';
    this.saveValidationError = null;
    this.isEditMode = true;
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFile = null;
    this.justificationFileError = null;
    this.saveSuccessMessage = '';
    this.saveValidationError = null;
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
    this.saveValidationError = this.validateChangedValues();
    if (this.saveValidationError) {
      this.cdr.detectChanges();
      return;
    }
    this.logger.debug('GrantDetailComponent onSave()', this.formModel, 'listId:', this.listId);
    const { justificationText, ...fields } = this.formModel;

    this.fundingSubmissionsService.bulkUpdateListGrants(
      { applIds: [this.data.applId], fields },
      this.listId
    ).subscribe({
      next: () => {
        this.logger.debug('Grant detail saved');
        this.applyFormModelToData();
        if (justificationText || this.justificationFile) {
          this.saveJustification(justificationText);
        } else {
          this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
          this.isEditMode = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => this.logger.error('Grant detail save error', err)
    });
  }

  private validateChangedValues(): string | null {
    const pct = this.formModel.docRecReductionPct;
    if (pct != null && (pct < 0 || pct > 100)) {
      return 'DOC Rec % Red must be between 0 and 100.';
    }

    if (pct != null && !this.hasAtMostTwoDecimals(Number(pct))) {
      return 'DOC Rec % Red must be a valid percentage with up to 2 decimal places.';
    }

    const amt = this.formModel.docRecAmt;
    if (amt != null && amt < 0) {
      return 'DOC Rec $ cannot be negative.';
    }

    if (amt != null && !this.hasAtMostTwoDecimals(Number(amt))) {
      return 'DOC Rec $ must be a valid dollar amount with up to 2 decimal places.';
    }

    const priority = this.formModel.docPriority as any;
    if (priority != null && priority !== '' && (!Number.isInteger(Number(priority)) || Number(priority) < 0)) {
      return 'DOC Priority must be a non-negative whole number.';
    }

    return null;
  }

  private hasAtMostTwoDecimals(value: number): boolean {
    if (!Number.isFinite(value)) {
      return false;
    }
    return Math.round(value * 100) === value * 100;
  }

  private saveJustification(justificationText: string): void {
    this.fundingSubmissionsService.saveJustificationForm(
      this.listId, this.data.applId, this.justificationFile ?? undefined, justificationText
    ).subscribe({
      next: () => {
        this.data.justificationText = justificationText;
        this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
        this.isEditMode = false;
        this.cdr.detectChanges();
      },
      error: (err) => this.logger.error('Justification save error', err)
    });
  }

  private applyFormModelToData(): void {
    this.data.docDecision                 = this.formModel.docDecision;
    this.data.docPriority                 = this.formModel.docPriority;
    this.data.docRecommendedAmount        = this.formModel.docRecAmt;
    this.data.docRecommendedReductionPct  = this.formModel.docRecReductionPct;
    this.data.docNciSelection             = this.formModel.docNciSelection;
    this.data.twoYearAnnualFundingR01Flag = this.formModel.annualFundingR01;
    this.data.budgetCategories            = this.formModel.budgetCategories;
    this.data.docNotes                    = this.formModel.docNotes;
    this.data.oefiaNotes                  = this.formModel.oefiaNotes;
    this.data.annualOrMyf                 = this.formModel.annualOrMyf;
  }
}
