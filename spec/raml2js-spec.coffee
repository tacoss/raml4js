describe 'raml2js', ->
  raml2js = require('../lib/raml2js')
  generated_client = null
  factory = null

  it 'should produce a valid CommonJS module as string', (done) ->
    raml2js __dirname + '/sample_api.raml', (err, data) ->
      code = raml2js.client(data)

      expect(err).toBeNull()
      expect(typeof code).toEqual 'string'
      expect(code).toContain 'module.exports'

      factory = code
      done()

  it 'should validate and debug the RAML-definition', (done) ->
    raml2js __dirname + '/sample_api.raml', (err, data) ->
      raml2js.validate { data }, (->), done

  it 'should create an api-client on the fly', ->
    expect(-> generated_client = eval(factory)()).not.toThrow()
    expect(typeof generated_client).toEqual 'object'

  it 'should expose a chainable api', ->
    generated_client.requestHandler (method, request_url, request_options) ->
      [method, request_url, request_options]

    try
      expect(generated_client.articles.get()).toEqual ['GET', 'http://api.example.com/v1/articles', data: {}]
      expect(generated_client.articles.articleId(1).get()).toEqual ['GET', 'http://api.example.com/v1/articles/1', data: {}]
      expect(generated_client.articles.articleId(4).property('body').get()).toEqual ['GET', 'http://api.example.com/v1/articles/4/body', data: {}]
      expect(generated_client.articles.articleId(13).property('excerpt').set.post()).toEqual ['POST', 'http://api.example.com/v1/articles/13/excerpt/set', data: {}]
      expect(generated_client.articles.articleId(20).trackback.put({ pong: 'true' })).toEqual ['PUT', 'http://api.example.com/v1/articles/20/trackback', data: { pong: 'true' }]
    catch e
      lines = factory.split '\n'
      params = e.stack.match(/<anonymous>:(\d+):(\d+)/)

      exception = if params
        new Error e.message + '\n' + lines[params[1] - 1] + '\n' + (new Array(+params[2])).join('.') + '^'
      else
        e

      throw exception
