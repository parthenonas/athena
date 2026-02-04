import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ProfileUpdatedEvent } from "../../../identity/profile/events/profile-updated.event";
import { AthenaEvent } from "../../../shared/events/types";
import { InstructorView } from "../schemas/instructor-view.schema";

@Injectable()
export class ProfileUpdatedListener {
  private readonly logger = new Logger(ProfileUpdatedListener.name);

  constructor(
    @InjectModel(InstructorView.name)
    private readonly instructorModel: Model<InstructorView>,
  ) {}

  @OnEvent(AthenaEvent.PROFILE_UPDATED)
  async handle(event: ProfileUpdatedEvent) {
    const result = await this.instructorModel.updateOne(
      { ownerId: event.ownerId },
      {
        $set: {
          firstName: event.firstName,
          lastName: event.lastName,
          avatarUrl: event.avatarUrl,
        },
      },
    );

    if (result.matchedCount > 0) {
      this.logger.log(`[InstructorView] Updated profile for ownerId: ${event.ownerId}`);
    }
  }
}
