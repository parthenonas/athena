import { Test, TestingModule } from "@nestjs/testing";

import { MediaEventListener } from "./media.listener.adapter";
import { MediaService } from "./media.service";
import { RoleDeletedEvent } from "../shared/events/types";

describe("MediaEventListener", () => {
  let listener: MediaEventListener;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaEventListener,
        {
          provide: MediaService,
          useValue: {
            deleteQuota: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<MediaEventListener>(MediaEventListener);
    mediaService = module.get(MediaService);
  });

  it("should be defined", () => {
    expect(listener).toBeDefined();
  });

  describe("handleRoleDeleted", () => {
    it("should call mediaService.deleteQuota when role is deleted", async () => {
      const payload: RoleDeletedEvent = { name: "test-role" };
      mediaService.deleteQuota.mockResolvedValue(undefined);

      await listener.handleRoleDeleted(payload);

      expect(mediaService.deleteQuota).toHaveBeenCalledWith("test-role");
      expect(mediaService.deleteQuota).toHaveBeenCalledTimes(1);
    });
  });
});
