const config = {
    prefix: '/!/elysium/',
    codec: $meteor_codecs.xor,
    debug: true,
    files: {
      client: '/M/meteor.client.js',
      worker: '/M/meteor.worker.js',
      bundle: '/M/meteor.bundle.js',
      codecs: '/M/meteor.codecs.js',
      config: '/M/meteor.config.js'
    }
  }
  
  self.__meteor$config = config
