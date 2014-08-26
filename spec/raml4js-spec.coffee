describe 'raml4js', ->
  raml4js = require('../lib/raml4js')

  factory_client = null
  generated_client = null

  it 'should produce a valid CommonJS module as string', (done) ->
    raml4js __dirname + '/sample_api.raml', (err, data) ->
      factory_client = raml4js.client(data)

      expect(err).toBeNull()
      expect(typeof factory_client).toEqual 'function'
      expect(factory_client.length).toEqual 1
      expect(factory_client.toString()).toContain 'function anonymous'

      done()

  it 'should validate and debug the RAML-definition', (done) ->
    raml4js __dirname + '/sample_api.raml', (err, data) ->
      raml4js.validate { data }, (->), done

  it 'should create an api-client on the fly', ->
    expect(-> generated_client = factory_client(baseUri: 'http://api.fake.com/{version}')).not.toThrow()
    expect(generated_client.options.baseUri).toEqual 'http://api.fake.com/{version}'
    expect(typeof generated_client).toEqual 'object'

  it 'should expose a chainable api', ->
    generated_client.requestHandler (method, request_url, request_options) ->
      [method, request_url, request_options]

    try
      expect(generated_client.articles.get()).toEqual ['GET', 'http://api.fake.com/v1/articles', data: {}]
      expect(generated_client.articles.articleId(1).get()).toEqual ['GET', 'http://api.fake.com/v1/articles/1', data: {}]
      expect(generated_client.articles.articleId(4).property('body').get()).toEqual ['GET', 'http://api.fake.com/v1/articles/4/body', data: {}]
      expect(generated_client.articles.articleId(13).property('excerpt').set.post()).toEqual ['POST', 'http://api.fake.com/v1/articles/13/excerpt/set', data: {}]
      expect(generated_client.articles.articleId(20).trackback.put({ pong: 'true' })).toEqual ['PUT', 'http://api.fake.com/v1/articles/20/trackback', data: { pong: 'true' }]

      expect(-> generated_client.articles.articleId('123')).toThrow()
      expect(-> generated_client.articles.articleId(100).get(value: '456')).toThrow()
    catch e
      lines = factory_client.split '\n'
      params = e.stack.match(/<anonymous>:(\d+):(\d+)/)

      exception = if params
        new Error e.message + '\n' + lines[params[1] - 1] + '\n' + (new Array(+params[2])).join('.') + '^'
      else
        e

      throw exception
