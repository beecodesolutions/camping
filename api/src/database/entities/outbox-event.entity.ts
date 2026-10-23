import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { CampingEntity } from './camping.entity'

@Entity({ name: 'outbox_events' })
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @ManyToOne(() => CampingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ name: 'aggregate_type', type: 'varchar', length: 64 })
  aggregateType!: string

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId!: string

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>

  @Column({
    name: 'occurred_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  occurredAt!: Date

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null

  @Column({ type: 'integer', default: 0 })
  attempts!: number

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null
}
