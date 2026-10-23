import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { CampingEntity } from './camping.entity'
import { AccommodationUnitEntity } from './accommodation-unit.entity'
import { AccommodationBlockEntity } from './accommodation-block.entity'
import { ReservationEntity } from './reservation.entity'
import { bigintNumberTransformer } from '../bigint.transformer'

export type InventoryMode = 'individual' | 'unlimited'
export type AccommodationMode = InventoryMode

@Entity({ name: 'accommodation_types' })
@Unique('uq_accommodation_types_camping_id', ['campingId', 'id'])
@Unique('uq_accommodation_types_camping_name', ['campingId', 'name'])
export class AccommodationTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @ManyToOne(() => CampingEntity, (camping) => camping.accommodationTypes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ type: 'varchar', length: 200 })
  name!: string

  @Column({ name: 'inventory_mode', type: 'varchar', length: 16 })
  inventoryMode!: InventoryMode

  @Column({ name: 'max_occupancy', type: 'integer', nullable: true })
  maxOccupancy!: number | null

  @Column({
    name: 'base_nightly_price_minor',
    type: 'bigint',
    transformer: bigintNumberTransformer,
  })
  baseNightlyPriceMinor!: number

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

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

  @OneToMany(() => AccommodationUnitEntity, (unit) => unit.accommodationType)
  units!: AccommodationUnitEntity[]

  @OneToMany(() => AccommodationBlockEntity, (block) => block.accommodationType)
  blocks!: AccommodationBlockEntity[]

  @OneToMany(
    () => ReservationEntity,
    (reservation) => reservation.accommodationType,
  )
  reservations!: ReservationEntity[]
}
