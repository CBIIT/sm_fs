import {NciPfrGrantQueryDto} from "@nci-cbiit/i2ecws-lib";

export interface NciPfrGrantQueryDtoEx extends NciPfrGrantQueryDto {
  selected ?: boolean;
}
