import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm'
import type { Payment } from '@camping/contracts'
import { bigintNumberTransformer } from '../bigint.transformer'
import { CampingEntity } from './camping.entity'
import { StayEntity } from './stay.entity'
import { UserEntity } from './user.entity'
import { ReservationEntity } from './reservation.entity'

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

  @Column({ name: 'stay_id', type: 'uuid', nullable: true })
  stayId!: string | null

  @ManyToOne(() => StayEntity, (stay) => stay.payments, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'stay_id' })
  stay!: Relation<StayEntity> | null

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId!: string | null

  @ManyToOne(() => ReservationEntity, (reservation) => reservation.payments, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Relation<ReservationEntity> | null

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

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null

  @Column({ name: 'voided_by_id', type: 'uuid', nullable: true })
  voidedById!: string | null

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy!: Relation<UserEntity> | null

  @Column({ name: 'void_reason', type: 'varchar', length: 200, nullable: true })
  voidReason!: string | null
}
