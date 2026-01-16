import { IEventBus } from "@athena/common";
import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * @class NestEventBusAdapter
 * @description Implementation of the IEventBus port using NestJS EventEmitter2.
 * This keeps our domain logic decoupled from the specific event library.
 */
@Injectable()
export class NestEventBusAdapter implements IEventBus {
  private readonly logger = new Logger(NestEventBusAdapter.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish<T>(eventName: string, payload: T): Promise<void> {
    this.logger.debug(`[EventBus] Publishing: ${eventName}`);
    await this.eventEmitter.emitAsync(eventName, payload);
  }
}
