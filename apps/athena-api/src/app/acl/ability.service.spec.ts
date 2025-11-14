import { Test, TestingModule } from "@nestjs/testing";
import { AbilityService } from "./ability.service";

describe("AbilityService", () => {
  let service: AbilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbilityService],
    }).compile();

    service = module.get<AbilityService>(AbilityService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
