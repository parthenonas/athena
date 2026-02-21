import { BlockContent, BlockType } from "@athena/types";
import { BadRequestException, Logger } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
  CodeBlockContentDto,
  QuizExamContentDto,
  QuizQuestionContentDto,
  TextBlockContentDto,
} from "../dto/content-payload.dto";

const logger = new Logger("BlockValidator");

/**
 * Shared utility to validate polymorphic block content based on its type.
 * Throws BadRequestException if validation fails.
 */
export async function validateBlockContentPayload(type: BlockType, content: BlockContent): Promise<void> {
  let dtoInstance: object;

  switch (type) {
    case BlockType.Text:
      dtoInstance = plainToInstance(TextBlockContentDto, content);
      break;
    case BlockType.Code:
      dtoInstance = plainToInstance(CodeBlockContentDto, content);
      break;
    case BlockType.QuizQuestion:
      dtoInstance = plainToInstance(QuizQuestionContentDto, content);
      break;
    case BlockType.QuizExam:
      dtoInstance = plainToInstance(QuizExamContentDto, content);
      break;
    default:
      return;
  }

  const errors = await validate(dtoInstance);

  if (errors.length > 0) {
    const messages = errors.map(err => Object.values(err.constraints || {}).join(", ")).join("; ");

    logger.warn(`Validation failed for block type ${type}: ${messages}`);
    throw new BadRequestException(`Invalid content for block type ${type}: ${messages}`);
  }
}
