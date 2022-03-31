import { NciPfrGrantQueryDto } from '@cbiit/i2ecws-lib';

export interface NciPfrGrantQueryDtoEx extends NciPfrGrantQueryDto {
  selected ?: boolean;
}

export function orderByPriorityAndPI(e1: NciPfrGrantQueryDtoEx, e2: NciPfrGrantQueryDtoEx): number {
  let result = e1.priorityScoreNum - e2.priorityScoreNum;

  if(result === 0) {
    if(e1.piFullName?.toLocaleUpperCase() < e2.piFullName?.toLocaleUpperCase()) {
      result = -1;
    } else if (e1.piFullName?.toLocaleUpperCase() > e2.piFullName?.toLocaleUpperCase()) {
      result = 1;
    }
  }
  return result;
}
