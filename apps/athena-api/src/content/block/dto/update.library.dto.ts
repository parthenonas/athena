import { PartialType } from "@nestjs/mapped-types";

import { CreateLibraryBlockDto } from "./create.library.dto";

/**
 * @class UpdateLibraryBlockDto
 * @description Payload for updating an existing Library template.
 * All fields are optional.
 */
export class UpdateLibraryBlockDto extends PartialType(CreateLibraryBlockDto) {}
