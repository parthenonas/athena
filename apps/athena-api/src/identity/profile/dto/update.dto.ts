import { UpdateProfileRequest } from "@athena/types";
import { PartialType } from "@nestjs/mapped-types";

import { CreateProfileDto } from "./create.dto";

/**
 * @class UpdateProfileDto
 * DTO for updating profile fields.
 * All fields are optional.
 */
export class UpdateProfileDto extends PartialType(CreateProfileDto) implements UpdateProfileRequest {}
