import { ExecutionStatus } from "@athena/types";
import { Test, TestingModule } from "@nestjs/testing";
import { Server, Socket } from "socket.io";

import { NotificationGateway } from "./notification.gateway";
import { SubmissionCompletedEvent } from "../shared/events/types";

describe("NotificationGateway", () => {
  let gateway: NotificationGateway;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    const mockEmitter = {
      emit: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnValue(mockEmitter),
    };

    mockClient = {
      id: "test-socket-id",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationGateway],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);

    gateway.server = mockServer as any;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("Connection Lifecycle", () => {
    it("should log connection", () => {
      const spy = jest.spyOn((gateway as any).logger, "debug");

      gateway.handleConnection(mockClient as any);

      expect(spy).toHaveBeenCalledWith(`Client connected: ${mockClient.id}`);
    });

    it("should log disconnection", () => {
      const spy = jest.spyOn((gateway as any).logger, "debug");

      gateway.handleDisconnect(mockClient as any);

      expect(spy).toHaveBeenCalledWith(`Client disconnected: ${mockClient.id}`);
    });
  });

  describe("handleSubmissionResult", () => {
    it('should emit "execution_result" to the specific socket if socketId is present', () => {
      const socketId = "client-xyz-123";
      const event: SubmissionCompletedEvent = {
        result: {
          submissionId: "sub-1",
          status: ExecutionStatus.Accepted,
          stdout: "Hello World",
          metadata: {
            context: "STUDIO",
            socketId: socketId,
          },
        },
      };

      gateway.handleSubmissionResult(event);

      expect(mockServer.to).toHaveBeenCalledWith(socketId);

      const mockEmitter = (mockServer.to as jest.Mock).mock.results[0].value;

      const expectedPayload = {
        submissionId: "sub-1",
        status: ExecutionStatus.Accepted,
        stdout: "Hello World",
        metadata: {
          context: "STUDIO",
          socketId: socketId,
        },
      };

      expect(mockEmitter.emit).toHaveBeenCalledWith("execution_result", expectedPayload);
    });

    it("should NOT emit anything if socketId is missing", () => {
      const event: SubmissionCompletedEvent = {
        result: {
          submissionId: "sub-2",
          status: ExecutionStatus.Accepted,
          metadata: {
            context: "LEARN",
          },
        },
      };

      gateway.handleSubmissionResult(event);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
