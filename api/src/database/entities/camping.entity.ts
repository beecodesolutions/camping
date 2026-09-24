import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { AgeRanges, Rates } from '@camping/contracts'
import { UserEntity } from './user.entity'
import { StayEntity } from './stay.entity'
import { ExtraTemplateEntity } from './extra-template.entity'

@Entity({ name: 'campings' })
@Unique('uq_campings_stable_key', ['stableKey'])
export class CampingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'stable_key', type: 'varchar', length: 100 })
  stableKey!: string

  @Column({ type: 'varchar', length: 160 })
  name!: string

  @Column({ type: 'varchar', length: 2 })
  country!: string

  @Column({ type: 'varchar', length: 3 })
  currency!: string

  @Column({ type: 'varchar', length: 64 })
  timezone!: string

  @Column({ name: 'age_ranges', type: 'jsonb' })
  ageRanges!: AgeRanges

  @Column({ type: 'jsonb' })
  rates!: Rates

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date

  @OneToMany(() => UserEntity, (user) => user.camping)
  users!: UserEntity[]

  @OneToMany(() => StayEntity, (stay) => stay.camping)
  stays!: StayEntity[]

  @OneToMany(() => ExtraTemplateEntity, (template) => template.camping)
  extraTemplates!: ExtraTemplateEntity[]
}
