import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";

import { OutboxMessage } from "./entities/outbox-message.entity";

/**
 * @class OutboxService
 * @description
 * Provides a low-level facade for persisting domain events into the Transactional Outbox table.
 * * This service is intended to be used *inside* an active database transaction initiated by a domain service.
 * It does NOT manage transactions itself; it relies on the provided `EntityManager`.
 *
 * ## The Pattern
 * The Transactional Outbox pattern ensures atomicity between database updates and event publishing.
 * Instead of publishing to a message broker immediately, we write the event to the same database
 * within the same transaction. A separate worker process then reads and publishes these events.
 */
@Injectable()
export class OutboxService {
  /**
   * Persists a domain event to the `outbox_messages` table.
   *
   * @param manager - The active EntityManager from the current transaction context.
   * @param type - The event type/name (e.g., 'role.deleted', 'user.created').
   * @param payload - The event data payload. Must be serializable to JSON.
   * * @returns Promise<void>
   * * @example
   * await dataSource.transaction(async (manager) => {
   * // 1. Perform business logic
   * await manager.save(User, newUser);
   * * // 2. Schedule event (atomic with #1)
   * await outboxService.save(manager, 'user.created', { id: newUser.id });
   * });
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async save(manager: EntityManager, type: string, payload: any): Promise<void> {
    const message = manager.create(OutboxMessage, {
      type,
      payload,
    });

    await manager.save(OutboxMessage, message);
  }
}
