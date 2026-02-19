import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  AthenaEvent,
  BlockCreatedEvent,
  BlockDeletedEvent,
  BlockReorderedEvent,
  BlockUpdatedEvent,
  LessonCreatedEvent,
  LessonDeletedEvent,
  LessonUpdatedEvent,
} from "../../../shared/events/types";
import { LessonView } from "../schemas/lesson-view.schema";

@Injectable()
export class ContentViewListener {
  private readonly logger = new Logger(ContentViewListener.name);

  constructor(
    @InjectModel(LessonView.name)
    private readonly lessonViewModel: Model<LessonView>,
  ) {}

  @OnEvent(AthenaEvent.LESSON_CREATED)
  async handleLessonCreated(event: LessonCreatedEvent) {
    try {
      await this.lessonViewModel.create({
        lessonId: event.lessonId,
        courseId: event.courseId,
        title: event.title,
        goals: event.goals,
        order: event.order,
        isDraft: event.isDraft,
        blocks: [],
      });
      this.logger.log(`Created view for lesson: ${event.lessonId}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to create lesson ${event.lessonId}: ${(error as Error)?.message}`);
    }
  }

  @OnEvent(AthenaEvent.LESSON_UPDATED)
  async handleLessonUpdated(event: LessonUpdatedEvent) {
    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId },
      {
        $set: {
          title: event.title,
          goals: event.goals,
          order: event.order,
          isDraft: event.isDraft,
        },
      },
    );
    this.logger.log(`Updated lesson: ${event.lessonId}`);
  }

  @OnEvent(AthenaEvent.LESSON_DELETED)
  async handleLessonDeleted(event: LessonDeletedEvent) {
    await this.lessonViewModel.deleteOne({ lessonId: event.lessonId });
    this.logger.log(`Deleted lesson: ${event.lessonId}`);
  }

  @OnEvent(AthenaEvent.BLOCK_CREATED)
  async handleBlockCreated(event: BlockCreatedEvent) {
    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId },
      {
        $push: {
          blocks: {
            $each: [
              {
                blockId: event.blockId,
                type: event.type,
                content: event.content,
                orderIndex: event.orderIndex,
                requiredAction: event.requiredAction,
              },
            ],
            $sort: { orderIndex: 1 },
          },
        },
      },
    );
    this.logger.log(`Added block ${event.blockId} to lesson ${event.lessonId}`);
  }

  @OnEvent(AthenaEvent.BLOCK_UPDATED)
  async handleBlockUpdated(event: BlockUpdatedEvent) {
    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId, "blocks.blockId": event.blockId },
      {
        $set: {
          "blocks.$.type": event.type,
          "blocks.$.content": event.content,
          "blocks.$.requiredAction": event.requiredAction,
        },
      },
    );
    this.logger.log(`Updated block ${event.blockId} in lesson ${event.lessonId}`);
  }

  @OnEvent(AthenaEvent.BLOCK_REORDERED)
  async handleBlockReordered(event: BlockReorderedEvent) {
    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId, "blocks.blockId": event.blockId },
      {
        $set: {
          "blocks.$.orderIndex": event.orderIndex,
        },
      },
    );

    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId },
      {
        $push: {
          blocks: {
            $each: [],
            $sort: { orderIndex: 1 },
          },
        },
      },
    );
    this.logger.log(`Reordered block ${event.blockId} in lesson ${event.lessonId}`);
  }

  @OnEvent(AthenaEvent.BLOCK_DELETED)
  async handleBlockDeleted(event: BlockDeletedEvent) {
    await this.lessonViewModel.updateOne(
      { lessonId: event.lessonId },
      {
        $pull: {
          blocks: { blockId: event.blockId },
        },
      },
    );
    this.logger.log(`Removed block ${event.blockId} from lesson ${event.lessonId}`);
  }
}
