import { Test, TestingModule } from "@nestjs/testing";
import { EntityManager } from "typeorm";

import { OutboxMessage } from "./entities/outbox-message.entity";
import { OutboxService } from "./outbox.service";

describe("OutboxService", () => {
  let service: OutboxService;

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as EntityManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("save", () => {
    it("should create and save an outbox message using the provided entity manager", async () => {
      const eventType = "test.event";
      const payload = { foo: "bar" };

      const createdMessage = {
        type: eventType,
        payload,
      } as any;

      (mockEntityManager.create as jest.Mock).mockReturnValue(createdMessage);
      (mockEntityManager.save as jest.Mock).mockResolvedValue(createdMessage);

      await service.save(mockEntityManager, eventType, payload);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxMessage, {
        type: eventType,
        payload,
      });

      expect(mockEntityManager.save).toHaveBeenCalledWith(OutboxMessage, createdMessage);
    });

    it("should bubble up errors if manager fails", async () => {
      const error = new Error("DB Error");
      (mockEntityManager.create as jest.Mock).mockReturnValue({});
      (mockEntityManager.save as jest.Mock).mockRejectedValue(error);

      await expect(service.save(mockEntityManager, "test", {})).rejects.toThrow(error);
    });
  });
});
