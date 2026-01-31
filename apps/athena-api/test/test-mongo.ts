import { GenericContainer, StartedTestContainer } from "testcontainers";

let mongo: StartedTestContainer;

export async function startTestMongo() {
  mongo = await new GenericContainer("mongo:latest")
    .withExposedPorts(27017)

    .withEnvironment({
      MONGO_INITDB_ROOT_USERNAME: "root",
      MONGO_INITDB_ROOT_PASSWORD: "root",
    })
    .start();

  const host = mongo.getHost();
  const port = mongo.getMappedPort(27017);

  process.env.MONGO_URI = `mongodb://root:root@${host}:${port}/athena?authSource=admin`;

  return mongo;
}

export async function stopTestMongo() {
  if (mongo) await mongo.stop();
}
