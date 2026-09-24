import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { CampingController } from './camping/camping.controller'
import { CampingService } from './camping/camping.service'
import { StayController } from './stays/stay.controller'
import { StayService } from './stays/stay.service'
import { ExtraController } from './extras/extra.controller'
import { ExtraService } from './extras/extra.service'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CampingController, StayController, ExtraController],
  providers: [CampingService, StayService, ExtraService],
})
export class AppModule {}
