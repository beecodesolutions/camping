import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  ageRangesSchema,
  campingProfileSchema,
  ratesSchema,
  type CampingProfile,
} from '@camping/contracts'
import { ensureSafeMoney } from '../common/date'
import { zodBadRequest, notFound } from '../common/errors'
import { CampingEntity } from '../database/entities/camping.entity'
import { StayEntity } from '../database/entities/stay.entity'
import type { AuthContext } from '../auth/auth.types'
import { StayService } from '../stays/stay.service'

@Injectable()
export class CampingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stayService: StayService,
  ) {}

  async profile(context: AuthContext): Promise<CampingProfile> {
    const camping = await this.dataSource
      .getRepository(CampingEntity)
      .findOne({ where: { id: context.camping.id } })
    if (!camping) throw notFound('Camping')
    const row = await this.dataSource
      .getRepository(StayEntity)
      .createQueryBuilder('stay')
      .select('COUNT(stay.id)', 'groups')
      .addSelect(
        'COALESCE(SUM(stay.adults + stay.children + stay.infants), 0)',
        'people',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN stay.has_vehicle THEN 1 ELSE 0 END), 0)',
        'vehicles',
      )
      .where('stay.camping_id = :campingId', { campingId: camping.id })
      .andWhere('stay.closed_at IS NULL')
      .getRawOne<{ groups: string; people: string; vehicles: string }>()
    const stays = await this.dataSource.getRepository(StayEntity).find({
      where: { campingId: camping.id },
      relations: { extras: true, payments: true },
    })
    const pendingAmountMinor = stays.reduce(
      (total, stay) =>
        ensureSafeMoney(
          total +
            Math.max(
              this.stayService.account(stay, camping.timezone).balanceMinor,
              0,
            ),
        ),
      0,
    )
    return campingProfileSchema.parse({
      id: camping.id,
      name: camping.name,
      country: camping.country,
      currency: camping.currency,
      timezone: camping.timezone,
      ageRanges: ageRangesSchema.parse(camping.ageRanges),
      rates: ratesSchema.parse(camping.rates),
      activeGroups: Number(row?.groups ?? 0),
      activePeople: Number(row?.people ?? 0),
      activeVehicles: Number(row?.vehicles ?? 0),
      pendingAmountMinor,
    })
  }

  async updateRates(
    context: AuthContext,
    raw: unknown,
  ): Promise<CampingProfile> {
    const parsed = ratesSchema.safeParse(raw)
    if (!parsed.success) throw zodBadRequest(parsed.error)
    await this.dataSource
      .getRepository(CampingEntity)
      .update(
        { id: context.camping.id },
        { rates: parsed.data, updatedAt: new Date() },
      )
    return this.profile(context)
  }
}
