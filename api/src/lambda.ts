import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Callback,
  Context,
  Handler,
} from 'aws-lambda'
import serverlessExpress from '@codegenie/serverless-express'
import { createNestApp } from './main'

type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>
let cachedHandler: ProxyHandler | undefined

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
  callback?: Callback<APIGatewayProxyResultV2>,
): Promise<APIGatewayProxyResultV2 | void> {
  if (!cachedHandler) {
    const app = await createNestApp()
    await app.init()
    cachedHandler = serverlessExpress({
      app: app.getHttpAdapter().getInstance(),
    }) as ProxyHandler
  }
  return cachedHandler(event, context, callback ?? (() => undefined))
}
