import { Pageable, Policy } from "@athena/types";
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateLibraryBlockDto } from "./dto/create.library.dto";
import { FilterLibraryBlockDto } from "./dto/filter.library.dto";
import { ReadLibraryBlockDto } from "./dto/read.library.dto";
import { UpdateLibraryBlockDto } from "./dto/update.library.dto";
import { LibraryBlock } from "./entities/library-block.entity";
import { validateBlockContentPayload } from "./utils/block-validator";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";

/**
 * @class BlockLibraryService
 * @description
 * Business logic for managing Library Blocks within a Lesson.
 *
 */
@Injectable()
export class BlockLibraryService extends BaseService<LibraryBlock> {
  private readonly logger = new Logger(BlockLibraryService.name);

  constructor(
    @InjectRepository(LibraryBlock)
    private readonly libraryRepo: Repository<LibraryBlock>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Saves a block as a template in the library.
   */
  async createLibraryBlock(dto: CreateLibraryBlockDto, userId: string): Promise<ReadLibraryBlockDto> {
    this.logger.log(`createLibraryBlock() | type=${dto.type}, userId=${userId}`);

    await validateBlockContentPayload(dto.type, dto.content);

    const template = this.libraryRepo.create({
      ownerId: userId,
      type: dto.type,
      tags: dto.tags,
      content: dto.content,
    });

    const savedTemplate = await this.libraryRepo.save(template);
    return this.toDto(savedTemplate, ReadLibraryBlockDto);
  }

  /**
   * Retrieves templates with pagination and GIN-indexed tag filtering.
   */
  async findLibraryBlocks(dto: FilterLibraryBlockDto, userId: string): Promise<Pageable<ReadLibraryBlockDto>> {
    this.logger.log(`findLibraryBlocks() | userId=${userId}`);

    const qb = this.libraryRepo.createQueryBuilder("lib");

    qb.andWhere("lib.owner_id = :userId", { userId });

    if (dto.type) {
      qb.andWhere("lib.type = :type", { type: dto.type });
    }

    if (dto.tags && dto.tags.length > 0) {
      qb.andWhere("lib.tags @> :tags", { tags: dto.tags });
    }

    if (dto.search) {
      // TODO: improve search here
      qb.andWhere("lib.content::text ILIKE :search", { search: `%${dto.search}%` });
    }

    qb.orderBy("lib.created_at", "DESC");
    qb.skip((dto.page - 1) * dto.limit).take(dto.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: this.toDtoArray(items, ReadLibraryBlockDto),
      meta: {
        total,
        page: dto.page,
        limit: dto.limit,
        pages: Math.ceil(total / dto.limit),
      },
    };
  }

  /**
   * Retrieves a single library block by ID.
   */
  async findOneLibraryBlock(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadLibraryBlockDto> {
    const template = await this.libraryRepo.findOne({ where: { id } });

    if (!template) throw new NotFoundException(`Library Block with ID ${id} not found`);

    for (const policy of appliedPolicies) {
      if (!this.identityService.checkAbility(policy, userId, template)) {
        throw new ForbiddenException("You are not allowed to access this template");
      }
    }

    return this.toDto(template, ReadLibraryBlockDto);
  }

  /**
   * Updates a library block template.
   */
  async updateLibraryBlock(
    id: string,
    dto: UpdateLibraryBlockDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<ReadLibraryBlockDto> {
    const template = await this.libraryRepo.findOne({ where: { id } });

    if (!template) throw new NotFoundException(`Library Block with ID ${id} not found`);

    for (const policy of appliedPolicies) {
      if (!this.identityService.checkAbility(policy, userId, template)) {
        throw new ForbiddenException("You are not allowed to edit this template");
      }
    }

    const targetType = dto.type || template.type;
    const targetContent = dto.content || template.content;

    if (dto.content || dto.type) {
      await validateBlockContentPayload(targetType, targetContent);
    }

    Object.assign(template, dto);
    if (dto.content) template.content = dto.content;

    const updatedTemplate = await this.libraryRepo.save(template);
    return this.toDto(updatedTemplate, ReadLibraryBlockDto);
  }

  /**
   * Deletes a library block template.
   */
  async removeLibraryBlock(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    const template = await this.libraryRepo.findOne({ where: { id } });

    if (!template) throw new NotFoundException(`Library Block with ID ${id} not found`);

    for (const policy of appliedPolicies) {
      if (!this.identityService.checkAbility(policy, userId, template)) {
        throw new ForbiddenException("You are not allowed to delete this template");
      }
    }

    await this.libraryRepo.remove(template);
  }
}
