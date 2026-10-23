import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { CampingEntity } from './camping.entity'
import { AccommodationTypeEntity } from './accommodation-type.entity'
import { AccommodationUnitEntity } from './accommodation-unit.entity'

@Entity({ name: 'accommodation_blocks' })
export class AccommodationBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @Column({ name: 'accommodation_type_id', type: 'uuid' })
  typeId!: string

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate!: string

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate!: string

  @ManyToOne(() => CampingEntity, (camping) => camping.accommodationBlocks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @ManyToOne(
    () => AccommodationTypeEntity,
    (accommodationType) => accommodationType.blocks,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'accommodation_type_id' })
  accommodationType!: AccommodationTypeEntity

  @ManyToOne(() => AccommodationUnitEntity, (unit) => unit.blocks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'unit_id' })
  unit!: AccommodationUnitEntity

  @Column({ type: 'varchar', length: 200 })
  reason!: string

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date
}
