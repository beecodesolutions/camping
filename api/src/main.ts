import 'reflect-metadata'
import type { Request, Response, NextFunction } from 'express'
import { NestFactory } from '@nestjs/core'
import { SafeExceptionFilter } from './common/exception.filter'
import { AppModule } from './app.module'

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: true })
  const origins = (process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.ALLOWED_ORIGIN ||
      origins.some((origin) => {
        try {
          const url = new URL(origin)
          return url.protocol !== 'https:' || url.origin !== origin
        } catch {
          return true
        }
      }))
  )
    throw new Error('Production requires exact HTTPS ALLOWED_ORIGIN')
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  app.useGlobalFilters(new SafeExceptionFilter())
  app.enableShutdownHooks()
  return app
}

async function main() {
  const app = await createNestApp()
  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? '127.0.0.1',
  )
}

if (require.main === module) void main()
