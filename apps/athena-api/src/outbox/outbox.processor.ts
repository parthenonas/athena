import { type IEventBus } from "@athena/common";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource } from "typeorm";

import { OutboxMessage } from "./entities/outbox-message.entity";

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private isProcessing = false;

  constructor(
    @Inject("IEventBus")
    private readonly eventBus: IEventBus,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Runs every 10 seconds to process pending messages.
   * Uses "SELECT ... FOR UPDATE SKIP LOCKED" to ensure safe concurrency
   * across multiple API instances.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleOutboxMessages() {
    if (this.isProcessing) {
      this.logger.debug("Previous outbox processing still running. Skipping.");
      return;
    }

    this.isProcessing = true;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const messages = await queryRunner.manager
        .createQueryBuilder(OutboxMessage, "outbox")
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .orderBy("outbox.created_at", "ASC")
        .take(50)
        .getMany();

      if (messages.length > 0) {
        this.logger.log(`Processing ${messages.length} outbox messages...`);

        for (const msg of messages) {
          try {
            await this.eventBus.publish(msg.type, msg.payload);
            await queryRunner.manager.remove(msg);
          } catch (err) {
            this.logger.error(`Failed to process message ${msg.id}`, (err as Error).stack);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.error("Outbox processing failed", (err as Error).stack);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      this.isProcessing = false;
    }
  }
}
