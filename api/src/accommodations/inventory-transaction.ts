import type { DataSource, EntityManager } from 'typeorm'
import { CampingEntity } from '../database/entities/camping.entity'
import { notFound } from '../common/errors'
import type { AuthContext } from '../auth/auth.types'

export type InventoryTransactionContext =
  { campingId: string } | Pick<AuthContext, 'camping'>

/**
 * Serialize every inventory mutation on the tenant row. Reservation writes
 * use the same protocol so availability checks cannot race another mutation.
 */
export async function withInventoryTransaction<T>(
  dataSource: DataSource,
  context: InventoryTransactionContext,
  callback: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const campingId =
    'campingId' in context ? context.campingId : context.camping.id
  return dataSource.transaction(async (manager) => {
    const camping = await manager.findOne(CampingEntity, {
      where: { id: campingId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!camping) throw notFound('Camping')
    return callback(manager)
  })
}
