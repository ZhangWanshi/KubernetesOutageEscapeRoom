function fn() {
  var port = karate.properties['server.port'] || '8081';
  return { baseUrl: 'http://localhost:' + port };
}
