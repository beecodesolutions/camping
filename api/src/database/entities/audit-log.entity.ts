import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { CampingEntity } from './camping.entity'
import { UserEntity } from './user.entity'

@Entity({ name: 'audit_logs' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null

  @ManyToOne(() => CampingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: Relation<UserEntity> | null

  @Column({ type: 'varchar', length: 64 })
  action!: string

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType!: string

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState!: Record<string, unknown> | null

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState!: Record<string, unknown> | null

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date
}
