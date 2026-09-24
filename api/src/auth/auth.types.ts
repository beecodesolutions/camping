import type { Request } from 'express'
import type { CampingEntity } from '../database/entities/camping.entity'
import type { UserEntity } from '../database/entities/user.entity'

export type AuthContext = { user: UserEntity; camping: CampingEntity }

export type AuthenticatedRequest = Request & { auth?: AuthContext }
