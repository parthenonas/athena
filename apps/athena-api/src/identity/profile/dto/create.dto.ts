import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from "@athena/common";
import { CreateProfileRequest, type ProfileMetadata } from "@athena/types";
import { Type } from "class-transformer";
import { IsDate, IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

/**
 * @class CreateProfileDto
 * DTO for initializing a user profile.
 * Usually called automatically when an Account is created or explicitly by Admin.
 */
export class CreateProfileDto implements CreateProfileRequest {
  /**
   * First name (Required).
   */
  @IsString()
  @MinLength(MIN_NAME_LENGTH)
  @MaxLength(MAX_NAME_LENGTH)
  firstName!: string;

  /**
   * Last name (Required).
   */
  @IsString()
  @MinLength(MIN_NAME_LENGTH)
  @MaxLength(MAX_NAME_LENGTH)
  lastName!: string;

  /**
   * Middle name / Patronymic (Optional).
   */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_LENGTH)
  patronymic?: string;

  /**
   * Link to avatar (Optional).
   */
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;

  /**
   * Date of birth (Optional).
   * Transformed from ISO string to Date object.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  /**
   * Arbitrary metadata (Optional).
   * Must be a valid JSON object.
   */
  @IsOptional()
  @IsObject()
  metadata?: ProfileMetadata;
}
