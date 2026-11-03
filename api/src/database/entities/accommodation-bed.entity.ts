import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { AccommodationUnitEntity } from './accommodation-unit.entity'

@Entity({ name: 'accommodation_beds' })
@Unique(['campingId', 'unitId', 'name'])
export class AccommodationBedEntity {
  @PrimaryGeneratedColumn('uuid') id!: string
  @Column({ name: 'camping_id', type: 'uuid' }) campingId!: string
  @Column({ name: 'unit_id', type: 'uuid' }) unitId!: string
  @ManyToOne(() => AccommodationUnitEntity, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'camping_id', referencedColumnName: 'campingId' },
    { name: 'unit_id', referencedColumnName: 'id' },
  ])
  unit!: AccommodationUnitEntity
  @Column({ type: 'varchar', length: 200 }) name!: string
  @Column({ type: 'integer', default: 0 }) position!: number
  @Column({ type: 'boolean', default: true }) enabled!: boolean
}
