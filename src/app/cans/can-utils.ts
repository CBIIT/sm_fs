import { CanCcxDto, FundingRequestCanDto } from '@cbiit/i2efsws-lib';


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
  const result: CanCcxDto = {
    can: can.can,
    canDescrip: can.canDescription,
    canPhsOrgCode: can.phsOrgCode,
    canReimburseableCode: can.reimburseableCode
  };

  return result;

}
