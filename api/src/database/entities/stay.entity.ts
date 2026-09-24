import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import type { AgeRanges, Rates } from '@camping/contracts'
import { CampingEntity } from './camping.entity'
import { UserEntity } from './user.entity'
import { AppliedExtraEntity } from './applied-extra.entity'
import { PaymentEntity } from './payment.entity'
import { bigintNumberTransformer } from '../bigint.transformer'

@Entity({ name: 'stays' })
@Index('idx_stays_camping_closed', ['campingId', 'closedAt'])
export class StayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @ManyToOne(() => CampingEntity, (camping) => camping.stays, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string

  @ManyToOne(() => UserEntity, (user) => user.createdStays, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: UserEntity

  @Column({ name: 'responsible_name', type: 'text' })
  responsibleName!: string

  @Column({ type: 'text', default: '' })
  document!: string

  @Column({ type: 'varchar', length: 2, default: '' })
  nationality!: string

  @Column({ type: 'varchar', length: 16, default: '' })
  phone!: string

  @Column({ name: 'arrival_date', type: 'date' })
  arrivalDate!: string

  @Column({ name: 'estimated_departure', type: 'date', nullable: true })
  estimatedDeparture!: string | null

  @Column({ type: 'bigint', transformer: bigintNumberTransformer })
  adults!: number

  @Column({ type: 'bigint', transformer: bigintNumberTransformer })
  children!: number

  @Column({ type: 'bigint', transformer: bigintNumberTransformer })
  infants!: number

  @Column({ name: 'has_vehicle', type: 'boolean', default: false })
  hasVehicle!: boolean

  @Column({ name: 'vehicle_description', type: 'text', default: '' })
  vehicleDescription!: string

  @Column({ name: 'license_plate', type: 'text', default: '' })
  licensePlate!: string

  @Column({ type: 'text', default: '' })
  location!: string

  @Column({ type: 'varchar', length: 3 })
  currency!: string

  @Column({ name: 'age_ranges', type: 'jsonb' })
  ageRanges!: AgeRanges

  @Column({ type: 'jsonb' })
  rates!: Rates

  @Column({ type: 'integer', default: 1 })
  version!: number

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null

  @Column({ name: 'closure', type: 'jsonb', nullable: true })
  closure!: {
    departureDate: string
    nights: number
    accommodationMinor: number
    extrasMinor: number
    totalMinor: number
    version: number
    closedAt: string
    closedBy: string
  } | null

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @OneToMany(() => AppliedExtraEntity, (extra) => extra.stay)
  extras!: AppliedExtraEntity[]

  @OneToMany(() => PaymentEntity, (payment) => payment.stay)
  payments!: PaymentEntity[]
}
