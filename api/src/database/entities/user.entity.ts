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
import { SessionEntity } from './session.entity'
import { StayEntity } from './stay.entity'

@Entity({ name: 'users' })
@Unique('uq_users_username', ['username'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'camping_id', type: 'uuid' })
  campingId!: string

  @ManyToOne(() => CampingEntity, (camping) => camping.users, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'camping_id' })
  camping!: CampingEntity

  @Column({ type: 'varchar', length: 100 })
  username!: string

  @Column({ type: 'varchar', length: 160 })
  name!: string

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string

  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt!: Date | null

  @Column({ name: 'failed_login_count', type: 'integer', default: 0 })
  failedLoginCount!: number

  @Column({ name: 'login_blocked_until', type: 'timestamptz', nullable: true })
  loginBlockedUntil!: Date | null

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions!: SessionEntity[]

  @OneToMany(() => StayEntity, (stay) => stay.createdBy)
  createdStays!: StayEntity[]
}
