import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { Payment } from '@camping/contracts'
import { bigintNumberTransformer } from '../bigint.transformer'
import { CampingEntity } from './camping.entity'
import { StayEntity } from './stay.entity'
import { UserEntity } from './user.entity'

@Entity({ name: 'payments' })
@Unique('uq_payments_camping_idempotency', ['campingId', 'idempotencyKey'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @ManyToOne(() => CampingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ name: 'stay_id', type: 'uuid' })
  stayId!: string

  @ManyToOne(() => StayEntity, (stay) => stay.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stay_id' })
  stay!: StayEntity

  @Column({
    name: 'amount_minor',
    type: 'bigint',
    transformer: bigintNumberTransformer,
  })
  amountMinor!: number

  @Column({ type: 'varchar', length: 16 })
  method!: Payment['method']

  @Column({ name: 'paid_on', type: 'date' })
  paidOn!: string

  @Column({ type: 'varchar', length: 200, default: '' })
  note!: string

  @Column({ name: 'recorded_by_id', type: 'uuid' })
  recordedById!: string

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_id' })
  recordedBy!: UserEntity

  @Column({ name: 'idempotency_key', type: 'uuid' })
  idempotencyKey!: string

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date
}
