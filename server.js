import Fastify from 'fastify'
import app from './app.js'

const fastify = Fastify({
  logger: true
})

fastify.register(app)

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})