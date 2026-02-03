import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateProfileDto } from "./dto/create.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { Profile } from "./entities/profile.entity";
import { AbilityService } from "../acl/ability.service";

/**
 * @class ProfileService
 * @description
 * Manages the lifecycle of user profiles (Personal Information).
 * Linked 1-to-1 with the Account entity via `ownerId`.
 *
 * ## Responsibilities:
 * - Create initial profile for an account
 * - Retrieve profile data by Owner ID with Policy enforcement
 * - Update profile details (partial updates) with Policy enforcement
 *
 * Note: Deletion is handled via Account lifecycle (Database Cascade on Hard Delete).
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly abilityService: AbilityService,
  ) {}

  /**
   * Creates a new profile for a specific account.
   * Enforces 1-to-1 relationship constraint.
   *
   * @param ownerId - The UUID of the account owner
   * @param dto - Initial profile data
   * @returns Created Profile entity
   *
   * @throws {BadRequestException} if profile already exists or DB fails
   */
  async create(ownerId: string, dto: CreateProfileDto): Promise<Profile> {
    this.logger.log(`create() | ownerId=${ownerId}`);

    try {
      const existing = await this.profileRepo.findOne({ where: { ownerId } });
      if (existing) {
        throw new BadRequestException("Profile for this account already exists");
      }

      const profile = this.profileRepo.create({
        ...dto,
        ownerId,
      });

      return await this.profileRepo.save(profile);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof QueryFailedError && error.message.includes("unique")) {
        throw new BadRequestException("Profile already exists");
      }
      throw new BadRequestException("Failed to create profile");
    }
  }

  /**
   * Retrieves profile by Owner ID.
   * Applies ACL policies via AbilityService.
   *
   * @param targetOwnerId - The UUID of the profile owner
   * @param requesterId - The UUID of the user making the request
   * @param policies - List of policies to enforce (e.g. OWN_ONLY)
   * @returns Profile entity
   *
   * @throws {NotFoundException} if profile not found
   * @throws {ForbiddenException} if policy check fails
   * @throws {BadRequestException} on DB error
   */
  async findByOwnerId(targetOwnerId: string, requesterId: string, policies: Policy[] = []): Promise<Profile> {
    this.logger.log(`findByOwnerId() | target=${targetOwnerId}, requester=${requesterId}`);

    try {
      const profile = await this.profileRepo.findOne({ where: { ownerId: targetOwnerId } });

      if (!profile) {
        this.logger.warn(`findByOwnerId() | Profile not found | target=${targetOwnerId}`);
        throw new NotFoundException("Profile not found");
      }

      for (const policy of policies) {
        if (!this.abilityService.check(policy, requesterId, profile)) {
          this.logger.warn(`Access denied | policy=${policy} | user=${requesterId}`);
          throw new ForbiddenException("You are not allowed to access this profile");
        }
      }

      return profile;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;

      this.logger.error(`findByOwnerId() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch profile");
    }
  }

  /**
   * Updates existing profile fields.
   * Performs a partial update based on provided DTO fields.
   * Applies ACL policies via AbilityService.
   *
   * @param targetOwnerId - The UUID of the profile owner
   * @param dto - Fields to update
   * @param requesterId - The UUID of the user making the request
   * @param policies - List of policies to enforce (e.g. OWN_ONLY)
   * @returns Updated Profile entity
   *
   * @throws {NotFoundException} if profile doesn't exist
   * @throws {ForbiddenException} if policy check fails
   * @throws {BadRequestException} on DB error
   */
  async update(
    targetOwnerId: string,
    dto: UpdateProfileDto,
    requesterId: string,
    policies: Policy[] = [],
  ): Promise<Profile> {
    this.logger.log(`update() | target=${targetOwnerId}, requester=${requesterId}`);

    try {
      const profile = await this.profileRepo.findOne({ where: { ownerId: targetOwnerId } });

      if (!profile) {
        throw new NotFoundException("Profile not found");
      }

      for (const policy of policies) {
        if (!this.abilityService.check(policy, requesterId, profile)) {
          throw new ForbiddenException("You are not allowed to update this profile");
        }
      }

      this.profileRepo.merge(profile, dto);
      const saved = await this.profileRepo.save(profile);

      this.logger.log(`update() | Profile updated | id=${saved.id}`);
      return saved;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;

      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to update profile");
    }
  }
}
