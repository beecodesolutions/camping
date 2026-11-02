import type { AccommodationPricing, GuestComposition } from '@camping/contracts'

export function safeMoney(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('Monetary overflow')
  return Number(value)
}
export function calendarNights(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const limit = new Date(`${end}T00:00:00Z`)
  if (!Number.isFinite(+cursor) || !Number.isFinite(+limit) || limit <= cursor)
    throw new Error('Invalid dates')
  while (cursor < limit) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
export function discountForBlock(
  nights: number[],
  rule: AccommodationPricing['discounts'][number],
): number {
  const total = nights.reduce((a, v) => a + BigInt(v), 0n)
  const benefit = rule.benefit
  let discount: bigint
  switch (benefit.type) {
    case 'PERCENTAGE':
      discount = (total * BigInt(benefit.value) + 5000n) / 10000n
      break
    case 'FIXED_AMOUNT':
      discount = BigInt(benefit.value)
      break
    case 'FIXED_PRICE':
      discount = total - BigInt(benefit.value)
      break
    case 'FREE_NIGHTS':
      discount = [...nights]
        .sort((a, b) => a - b)
        .slice(0, benefit.value)
        .reduce((a, v) => a + BigInt(v), 0n)
      break
  }
  return safeMoney(discount < 0n ? 0n : discount > total ? total : discount)
}
export function nightlyPrice(
  pricing: AccommodationPricing,
  guests: GuestComposition,
  start: string,
  end: string,
  beds: number,
) {
  const quantity = pricing.basis === 'per_bed' ? beds : 1
  const unitNights = calendarNights(start, end).map((date) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const rate = {
      ...pricing,
      ...pricing.weekdays.find((d) => d.day === weekday)?.rates,
    }
    const categoryCharges = { adults: 0, children: 0, infants: 0 }
    for (const category of ['adults', 'children', 'infants'] as const) {
      if (pricing.basis === 'per_person')
        categoryCharges[category] = safeMoney(
          BigInt(guests[category]) * BigInt(rate.rates[category]),
        )
      if (pricing.basis === 'per_unit')
        categoryCharges[category] = safeMoney(
          BigInt(
            Math.max(0, guests[category] - pricing.includedOccupancy[category]),
          ) * BigInt(rate.extraPersonRates[category]),
        )
    }
    const human = Object.values(categoryCharges).reduce(
      (sum, value) => sum + BigInt(value),
      0n,
    )
    const baseMinor =
      pricing.basis === 'per_person' ? 0 : rate.baseNightlyPriceMinor
    return {
      date,
      baseMinor,
      humanMinor: safeMoney(human),
      categoryCharges,
      petMinor: safeMoney(
        BigInt(guests.pets) * BigInt(rate.petNightlyPriceMinor),
      ),
    }
  })
  let discountMinor = 0
  let discountRuleIndex: number | null = null
  pricing.discounts.forEach((rule, index) => {
    let candidate = 0n
    const blocks = rule.repeat
      ? Math.floor(unitNights.length / rule.blockNights)
      : Math.min(1, Math.floor(unitNights.length / rule.blockNights))
    for (let block = 0; block < blocks; block++) {
      const slice = unitNights.slice(
        block * rule.blockNights,
        (block + 1) * rule.blockNights,
      )
      candidate +=
        BigInt(
          discountForBlock(
            slice.map((n) => n.baseMinor + n.humanMinor),
            rule,
          ),
        ) * BigInt(quantity)
    }
    const amount = safeMoney(candidate)
    if (amount > discountMinor) {
      discountMinor = amount
      discountRuleIndex = index
    }
  })
  const nights = unitNights.map((n) => ({
    ...n,
    baseMinor: safeMoney(BigInt(n.baseMinor) * BigInt(quantity)),
    humanMinor: safeMoney(BigInt(n.humanMinor) * BigInt(quantity)),
  }))
  const sum = (key: 'baseMinor' | 'humanMinor' | 'petMinor') =>
    safeMoney(nights.reduce((a, n) => a + BigInt(n[key]), 0n))
  const accommodationMinor = sum('baseMinor'),
    humanMinor = sum('humanMinor'),
    petMinor = sum('petMinor')
  const categoryCharges = { adults: 0, children: 0, infants: 0 }
  for (const category of ['adults', 'children', 'infants'] as const)
    categoryCharges[category] = safeMoney(
      nights.reduce(
        (sum, night) => sum + BigInt(night.categoryCharges[category]),
        0n,
      ) * BigInt(quantity),
    )
  return {
    nights,
    categoryCharges,
    accommodationMinor,
    humanMinor,
    discountMinor,
    petMinor,
    discountRuleIndex,
    totalMinor: safeMoney(
      BigInt(accommodationMinor) +
        BigInt(humanMinor) -
        BigInt(discountMinor) +
        BigInt(petMinor),
    ),
  }
}
