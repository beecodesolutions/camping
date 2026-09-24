import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { CampingEntity } from './camping.entity'
import { AppliedExtraEntity } from './applied-extra.entity'
import { bigintNumberTransformer } from '../bigint.transformer'

@Entity({ name: 'extra_templates' })
@Index('uq_extra_templates_camping_seed_key', ['campingId', 'seedKey'], {
  unique: true,
  where: '"seed_key" IS NOT NULL',
})
export class ExtraTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @Column({ name: 'seed_key', type: 'varchar', length: 100, nullable: true })
  seedKey!: string | null

  @ManyToOne(() => CampingEntity, (camping) => camping.extraTemplates, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ type: 'varchar', length: 200 })
  description!: string

  @Column({ type: 'varchar', length: 100, default: '' })
  category!: string

  @Column({
    name: 'unit_price_minor',
    type: 'bigint',
    transformer: bigintNumberTransformer,
  })
  unitPriceMinor!: number

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

  @OneToMany(() => AppliedExtraEntity, (extra) => extra.template)
  appliedExtras!: AppliedExtraEntity[]
}
