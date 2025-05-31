// app.js
import routes from './src/application/handlers/route.js'

async function app (fastify, options) {
  fastify.register(routes)
}

export default app