import { pilotCamping, pilotExtras } from '@camping/contracts'
import { CampingEntity } from '../database/entities/camping.entity'
import { ExtraTemplateEntity } from '../database/entities/extra-template.entity'
import {
  createAdminDataSource,
  destroy,
  inputError,
  reportCliFailure,
} from './common'

async function seed(): Promise<void> {
  const dataSource = await createAdminDataSource()
  try {
    await dataSource.initialize()
    await dataSource.transaction(async (manager) => {
      const campingRepository = manager.getRepository(CampingEntity)
      let camping = await campingRepository.findOne({
        where: { stableKey: pilotCamping.key },
      })
      if (!camping) {
        camping = await campingRepository.save(
          campingRepository.create({
            ...pilotCamping,
            stableKey: pilotCamping.key,
          }),
        )
      } else {
        const ranges = camping.ageRanges
        const expected = pilotCamping.ageRanges
        const hasExpectedIdentity =
          camping.name === pilotCamping.name &&
          camping.country === pilotCamping.country &&
          camping.currency === pilotCamping.currency &&
          camping.timezone === pilotCamping.timezone &&
          ranges.infants.min === expected.infants.min &&
          ranges.infants.max === expected.infants.max &&
          ranges.children.min === expected.children.min &&
          ranges.children.max === expected.children.max &&
          ranges.adults.min === expected.adults.min &&
          ranges.adults.max === expected.adults.max
        if (!hasExpectedIdentity) {
          inputError(
            `Camping ${pilotCamping.key} does not match the fixed pilot identity; refusing to seed`,
          )
        }
      }

      const templateRepository = manager.getRepository(ExtraTemplateEntity)
      for (const extra of pilotExtras) {
        const existing = await templateRepository.findOne({
          where: { campingId: camping.id, seedKey: extra.key },
        })
        if (existing) continue
        await templateRepository.save(
          templateRepository.create({
            campingId: camping.id,
            seedKey: extra.key,
            category: extra.category,
            description: extra.description,
            unitPriceMinor: extra.unitPriceMinor,
            enabled: true,
          }),
        )
      }
    })
    console.log('Pilot seed is present; existing configuration was preserved')
  } finally {
    await destroy(dataSource)
  }
}

void seed().catch((error: unknown) => {
  reportCliFailure('Seed', error)
  process.exitCode = 1
})
