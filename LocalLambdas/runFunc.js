const runFunc = (functionPath, rawEvent) => {
  const parsedEvent = JSON.parse(rawEvent);
  const { handler } = require(functionPath);

  console.log(JSON.stringify(handler(parsedEvent)));
}

runFunc(process.argv[2], process.argv[3]);
