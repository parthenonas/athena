export interface IEventBus {
  publish<T>(eventName: string, payload: T): Promise<void>;
}
