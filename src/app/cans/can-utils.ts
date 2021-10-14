import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';


export function convertToFundingRequestCan(can: CanCcxDto): FundingRequestCanDto {
  const result: FundingRequestCanDto = {
    can: can.can,
    canDescription: can.canDescrip,
    nciSourceFlag: (can.canPhsOrgCode === 'CA' ? 'Y' : 'N'),
    phsOrgCode: can.canPhsOrgCode,
    reimburseableCode: can.canReimburseableCode
  };


  return result;
}

export function convertToCanCcx(can: FundingRequestCanDto): CanCcxDto {
  const result: CanCcxDto = {};

  return result;

}
