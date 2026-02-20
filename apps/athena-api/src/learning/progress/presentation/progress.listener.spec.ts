import { CommandBus } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { ProgressEventListener } from "./progress.listener";
import { EnrollmentCreatedEvent, EnrollmentDeletedEvent } from "../../../shared/events/types";
import { DeleteProgressCommand } from "../application/commands/delete-progress.command";
import { InitializeProgressCommand } from "../application/commands/initialize-progress.command";

const mockCommandBus = {
  execute: jest.fn(),
};

describe("ProgressEventListener", () => {
  let listener: ProgressEventListener;

  const MOCK_EVENT: EnrollmentCreatedEvent = {
    id: "enrollment-1",
    userId: "student-1",
    courseId: "course-1",
    cohortId: "cohort-1",
  };

  const MOCK_DELETED_EVENT: EnrollmentDeletedEvent = {
    id: "enrollment-1",
    userId: "student-1",
    courseId: "course-1",
    cohortId: "cohort-1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressEventListener, { provide: CommandBus, useValue: mockCommandBus }],
    }).compile();

    listener = module.get<ProgressEventListener>(ProgressEventListener);

    jest.clearAllMocks();
  });

  it("should dispatch InitializeProgressCommand on ENROLLMENT_CREATED event", async () => {
    await listener.handleEnrollmentCreated(MOCK_EVENT);

    expect(mockCommandBus.execute).toHaveBeenCalledWith(expect.any(InitializeProgressCommand));

    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: MOCK_EVENT.id,
        courseId: MOCK_EVENT.courseId,
        studentId: MOCK_EVENT.userId,
      }),
    );
  });

  it("should dispatch DeleteProgressCommand on ENROLLMENT_DELETED event", async () => {
    await listener.handleEnrollmentDeleted(MOCK_DELETED_EVENT);

    expect(mockCommandBus.execute).toHaveBeenCalledWith(expect.any(DeleteProgressCommand));

    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: MOCK_DELETED_EVENT.id,
        courseId: MOCK_DELETED_EVENT.courseId,
        studentId: MOCK_DELETED_EVENT.userId,
      }),
    );
  });
});
