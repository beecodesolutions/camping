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
import { AccommodationTypeEntity } from './accommodation-type.entity'
import { AccommodationBlockEntity } from './accommodation-block.entity'
import { ReservationEntity } from './reservation.entity'

@Entity({ name: 'accommodation_units' })
@Unique('uq_accommodation_units_camping_id', ['campingId', 'id'])
@Unique('uq_accommodation_units_type_name', ['campingId', 'typeId', 'name'])
export class AccommodationUnitEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @Column({ name: 'accommodation_type_id', type: 'uuid' })
  typeId!: string

  @ManyToOne(() => CampingEntity, (camping) => camping.accommodationUnits, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @ManyToOne(
    () => AccommodationTypeEntity,
    (accommodationType) => accommodationType.units,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'accommodation_type_id' })
  accommodationType!: AccommodationTypeEntity

  @Column({ type: 'varchar', length: 200 })
  name!: string

  @Column({ name: 'max_occupancy', type: 'integer' })
  maxOccupancy!: number

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

  @OneToMany(() => AccommodationBlockEntity, (block) => block.unit)
  blocks!: AccommodationBlockEntity[]

  @OneToMany(() => ReservationEntity, (reservation) => reservation.unit)
  reservations!: ReservationEntity[]
}
