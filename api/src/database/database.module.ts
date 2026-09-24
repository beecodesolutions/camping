import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { createDataSource } from './data-source'

const dataSourceProvider = {
  provide: DataSource,
  useFactory: async () => {
    const dataSource = createDataSource()
    await dataSource.initialize()
    return dataSource
  },
}

@Global()
@Module({ providers: [dataSourceProvider], exports: [DataSource] })
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy()
  }
}
