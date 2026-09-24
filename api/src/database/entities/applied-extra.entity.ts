import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { StayEntity } from './stay.entity'
import { ExtraTemplateEntity } from './extra-template.entity'
import { bigintNumberTransformer } from '../bigint.transformer'

@Entity({ name: 'applied_extras' })
@Unique('uq_applied_extras_stay_id', ['id', 'stayId'])
export class AppliedExtraEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'stay_id', type: 'uuid' })
  stayId!: string

  @ManyToOne(() => StayEntity, (stay) => stay.extras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stay_id' })
  stay!: StayEntity

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null

  @ManyToOne(() => ExtraTemplateEntity, (template) => template.appliedExtras, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'template_id' })
  template!: ExtraTemplateEntity | null

  @Column({ type: 'varchar', length: 200 })
  description!: string

  @Column({ type: 'varchar', length: 100, default: '' })
  category!: string

  @Column({ type: 'bigint', transformer: bigintNumberTransformer })
  quantity!: number

  @Column({
    name: 'unit_price_minor',
    type: 'bigint',
    transformer: bigintNumberTransformer,
  })
  unitPriceMinor!: number

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date
}
