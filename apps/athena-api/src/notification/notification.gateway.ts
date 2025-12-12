import type { SubmissionCompletedEvent } from "@athena/types";
import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

/**
 * @class NotificationGateway
 * @description WebSocket Gateway responsible for real-time notifications to clients.
 * It acts as a bridge between the internal system events (specifically code execution results)
 * and the frontend via Socket.IO.
 *
 * It listens for internal events emitted by the SubmissionQueueModule and forwards
 * the results to the specific client who initiated the request.
 */
@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Reference to the Socket.IO server instance.
   * Used to target specific sockets/rooms for message emission.
   */
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /**
   * Lifecycle hook triggered when a new client connects to the Gateway.
   * @param client - The connected Socket instance.
   */
  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  /**
   * Lifecycle hook triggered when a client disconnects from the Gateway.
   * @param client - The disconnected Socket instance.
   */
  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Event listener for the internal 'submission.completed' event.
   * This method is triggered when the Runner finishes executing a job and the
   * SubmissionResultProcessor emits the event via EventEmitter2.
   *
   * @param event - The payload containing the execution result and metadata.
   * @description
   * 1. Extracts `metadata` and the execution `result`.
   * 2. Checks if a `socketId` is present in the metadata (Boomerang pattern).
   * 3. If present, emits the 'execution_result' WS event strictly to that socket.
   */
  @OnEvent("submission.completed")
  handleSubmissionResult(event: SubmissionCompletedEvent) {
    const { metadata, ...result } = event;

    if (metadata?.socketId) {
      this.logger.log(`Sending result to socket: ${metadata.socketId}`);

      this.server.to(metadata.socketId).emit("execution_result", result);
    }
  }
}
