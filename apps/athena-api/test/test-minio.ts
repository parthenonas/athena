import { GenericContainer, StartedTestContainer } from "testcontainers";

let minio: StartedTestContainer;

export async function startTestMinio() {
  minio = await new GenericContainer("minio/minio:latest")
    .withExposedPorts(9000)
    .withEnvironment({
      MINIO_ROOT_USER: "minioadmin",
      MINIO_ROOT_PASSWORD: "minioadmin",
    })
    .withCommand(["server", "/data"])
    .start();

  const host = minio.getHost();
  const port = minio.getMappedPort(9000);

  process.env.STORAGE_ENDPOINT = `http://${host}:${port}`;
  process.env.STORAGE_ACCESS_KEY = "minioadmin";
  process.env.STORAGE_SECRET_KEY = "minioadmin";
  process.env.STORAGE_BUCKET_NAME = "athena-test-bucket";
  process.env.STORAGE_REGION = "us-east-1";

  return minio;
}

export async function stopTestMinio() {
  if (minio) await minio.stop();
}
