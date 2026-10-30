import { BadRequestException } from '@nestjs/common'
import { hasMoneyPrecision, type MoneyDecimals } from '@camping/contracts'

export function assertMoneyPrecision(
  amount: number,
  currency: string,
  decimals: MoneyDecimals,
) {
  if (!hasMoneyPrecision(amount, currency, decimals))
    throw new BadRequestException('Este importe no admite centavos')
}
