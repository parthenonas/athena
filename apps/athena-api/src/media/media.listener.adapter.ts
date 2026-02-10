import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { MediaService } from "./media.service";
import { AthenaEvent, type RoleDeletedEvent } from "../shared/events/types";

@Injectable()
export class MediaEventListener {
  private readonly logger = new Logger(MediaEventListener.name);

  constructor(private readonly mediaService: MediaService) {}

  @OnEvent(AthenaEvent.ROLE_DELETED)
  async handleRoleDeleted(payload: RoleDeletedEvent) {
    this.logger.log(`Received event: ${AthenaEvent.ROLE_DELETED} for role "${payload.name}"`);

    await this.mediaService.deleteQuota(payload.name);
  }
}
