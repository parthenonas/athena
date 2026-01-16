import { IEventBus } from "@athena/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource, QueryRunner } from "typeorm";

import { OutboxMessage } from "./entities/outbox-message.entity";
import { OutboxProcessor } from "./outbox.processor";

describe("OutboxProcessor", () => {
  let processor: OutboxProcessor;
  let dataSource: jest.Mocked<DataSource>;
  let eventBus: jest.Mocked<IEventBus>;

  const qbMock = {
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const queryRunnerMock = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      remove: jest.fn(),
      save: jest.fn(),
    },
  } as unknown as jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxProcessor,
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
          },
        },
        {
          provide: "IEventBus",
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<OutboxProcessor>(OutboxProcessor);
    dataSource = module.get(DataSource);
    eventBus = module.get("IEventBus");
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  describe("handleOutboxMessages", () => {
    it("should process nothing if no messages found", async () => {
      qbMock.getMany.mockResolvedValue([]);

      await processor.handleOutboxMessages();

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunnerMock.connect).toHaveBeenCalled();
      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();

      expect(qbMock.setLock).toHaveBeenCalledWith("pessimistic_write");
      expect(qbMock.setOnLocked).toHaveBeenCalledWith("skip_locked");

      expect(eventBus.publish).not.toHaveBeenCalled();
      expect(queryRunnerMock.manager.remove).not.toHaveBeenCalled();

      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it("should publish and remove messages on success", async () => {
      const messages = [
        { id: "1", type: "test.event", payload: { val: 1 } },
        { id: "2", type: "other.event", payload: { val: 2 } },
      ] as any[];

      qbMock.getMany.mockResolvedValue(messages);

      await processor.handleOutboxMessages();

      expect(eventBus.publish).toHaveBeenNthCalledWith(1, "test.event", { val: 1 });
      expect(eventBus.publish).toHaveBeenNthCalledWith(2, "other.event", { val: 2 });

      expect(queryRunnerMock.manager.remove).toHaveBeenCalledTimes(2);
      expect(queryRunnerMock.manager.remove).toHaveBeenCalledWith(messages[0]);
      expect(queryRunnerMock.manager.remove).toHaveBeenCalledWith(messages[1]);

      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    });

    it("should handle partial failures (one fails, one succeeds)", async () => {
      const messages = [
        { id: "1", type: "fail.event", payload: {} },
        { id: "2", type: "success.event", payload: {} },
      ] as OutboxMessage[];

      qbMock.getMany.mockResolvedValue(messages);

      eventBus.publish.mockRejectedValueOnce(new Error("Publish failed")).mockResolvedValueOnce(undefined);

      await processor.handleOutboxMessages();

      expect(eventBus.publish).toHaveBeenCalledWith("fail.event", {});
      expect(queryRunnerMock.manager.remove).not.toHaveBeenCalledWith(messages[0]);

      expect(eventBus.publish).toHaveBeenCalledWith("success.event", {});
      expect(queryRunnerMock.manager.remove).toHaveBeenCalledWith(messages[1]);

      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    });

    it("should rollback transaction on DB fetch error", async () => {
      const error = new Error("DB Connection Died");
      qbMock.getMany.mockRejectedValue(error);

      await processor.handleOutboxMessages();

      expect(eventBus.publish).not.toHaveBeenCalled();
      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it("should prevent concurrent execution (guard check)", async () => {
      queryRunnerMock.connect.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)));

      const execution1 = processor.handleOutboxMessages();

      const execution2 = processor.handleOutboxMessages();

      await Promise.all([execution1, execution2]);

      expect(queryRunnerMock.connect).toHaveBeenCalledTimes(1);
    });
  });
});
