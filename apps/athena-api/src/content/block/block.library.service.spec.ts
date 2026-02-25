import { BlockType, Pageable, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BlockLibraryService } from "./block.library.service";
import { CreateLibraryBlockDto } from "./dto/create.library.dto";
import { FilterLibraryBlockDto } from "./dto/filter.library.dto";
import { UpdateLibraryBlockDto } from "./dto/update.library.dto";
import { LibraryBlock } from "./entities/library-block.entity";
import { IdentityService } from "../../identity";
import { validateBlockContentPayload } from "./utils/block-validator";

jest.mock("./utils/block-validator", () => ({
  validateBlockContentPayload: jest.fn(),
}));

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEMPLATE_ID = "template-1";

const mockLibraryBlock = {
  id: TEMPLATE_ID,
  ownerId: USER_ID,
  type: BlockType.Text,
  tags: ["theory", "intro"],
  content: { json: { type: "doc" } },
  createdAt: new Date(),
  updatedAt: new Date(),
} as LibraryBlock;

describe("BlockLibraryService", () => {
  let service: BlockLibraryService;
  let libraryRepo: jest.Mocked<Repository<LibraryBlock>>;
  let identityService: jest.Mocked<IdentityService>;

  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockLibraryService,
        {
          provide: getRepositoryToken(LibraryBlock),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: IdentityService,
          useValue: { checkAbility: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BlockLibraryService>(BlockLibraryService);
    libraryRepo = module.get(getRepositoryToken(LibraryBlock));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
  });

  describe("createLibraryBlock", () => {
    const createDto: CreateLibraryBlockDto = {
      type: BlockType.Text,
      tags: ["test"],
      content: { json: { foo: "bar" } },
    };

    it("should successfully create a library template", async () => {
      (validateBlockContentPayload as jest.Mock).mockResolvedValue(undefined);
      libraryRepo.create.mockReturnValue(mockLibraryBlock);
      libraryRepo.save.mockResolvedValue(mockLibraryBlock);

      const result = await service.createLibraryBlock(createDto, USER_ID);

      expect(validateBlockContentPayload).toHaveBeenCalledWith(createDto.type, createDto.content);
      expect(libraryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: USER_ID,
          type: createDto.type,
          tags: createDto.tags,
        }),
      );
      expect(libraryRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(TEMPLATE_ID);
    });

    it("should throw BadRequestException if validation fails", async () => {
      (validateBlockContentPayload as jest.Mock).mockRejectedValue(new BadRequestException("Invalid content"));

      await expect(service.createLibraryBlock(createDto, USER_ID)).rejects.toThrow(BadRequestException);
      expect(libraryRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("findLibraryBlocks", () => {
    it("should return paginated blocks with filters", async () => {
      const filterDto: FilterLibraryBlockDto = {
        type: BlockType.Text,
        tags: ["sql", "join"],
        search: "keyword",
        page: 2,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "ASC",
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLibraryBlock], 1]);

      const result: Pageable<any> = await service.findLibraryBlocks(filterDto, USER_ID);

      expect(libraryRepo.createQueryBuilder).toHaveBeenCalledWith("lib");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("lib.owner_id = :userId", { userId: USER_ID });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("lib.type = :type", { type: BlockType.Text });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("lib.tags @> :tags", { tags: ["sql", "join"] });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("lib.content::text ILIKE :search", {
        search: "%keyword%",
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe(TEMPLATE_ID);
    });
  });

  describe("findOneLibraryBlock", () => {
    it("should return template if found and ACL passes", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(true);

      const result = await service.findOneLibraryBlock(TEMPLATE_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(libraryRepo.findOne).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID } });
      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockLibraryBlock);
      expect(result.id).toBe(TEMPLATE_ID);
    });

    it("should throw NotFoundException if template missing", async () => {
      libraryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneLibraryBlock("bad-id", USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if ACL fails (Not the owner)", async () => {
      libraryRepo.findOne.mockResolvedValue({ ...mockLibraryBlock, ownerId: OTHER_USER_ID } as LibraryBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOneLibraryBlock(TEMPLATE_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("updateLibraryBlock", () => {
    const updateDto: UpdateLibraryBlockDto = {
      content: { json: { updated: "true" } },
    };

    it("should update template if allowed and content valid", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(true);
      (validateBlockContentPayload as jest.Mock).mockResolvedValue(undefined);
      libraryRepo.save.mockImplementation(ent => Promise.resolve(ent as LibraryBlock));

      const result = await service.updateLibraryBlock(TEMPLATE_ID, updateDto, USER_ID, [Policy.OWN_ONLY]);

      expect(validateBlockContentPayload).toHaveBeenCalled();
      expect(libraryRepo.save).toHaveBeenCalled();
      expect(result.content).toEqual(updateDto.content);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.updateLibraryBlock(TEMPLATE_ID, updateDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
      expect(libraryRepo.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if switching type to invalid content", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(true);

      const badUpdateDto: UpdateLibraryBlockDto = {
        type: BlockType.QuizQuestion,
        content: { json: { missing: "everything" } },
      };

      (validateBlockContentPayload as jest.Mock).mockRejectedValue(new BadRequestException("Invalid content"));

      await expect(service.updateLibraryBlock(TEMPLATE_ID, badUpdateDto, USER_ID)).rejects.toThrow(BadRequestException);
      expect(libraryRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("removeLibraryBlock", () => {
    it("should remove template if allowed", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(true);

      await service.removeLibraryBlock(TEMPLATE_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(libraryRepo.remove).toHaveBeenCalledWith(mockLibraryBlock);
    });

    it("should throw NotFoundException if template missing", async () => {
      libraryRepo.findOne.mockResolvedValue(null);
      await expect(service.removeLibraryBlock(TEMPLATE_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      libraryRepo.findOne.mockResolvedValue(mockLibraryBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.removeLibraryBlock(TEMPLATE_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
      expect(libraryRepo.remove).not.toHaveBeenCalled();
    });
  });
});
