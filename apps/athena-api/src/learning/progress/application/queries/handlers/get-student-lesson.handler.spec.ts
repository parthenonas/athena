import { BlockRequiredAction, BlockType, GradingStatus } from "@athena/types";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { GetStudentLessonHandler } from "./get-student-lesson.handler";
import { ContentService } from "../../../../../content/content.service";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { GetStudentLessonQuery } from "../get-student-lesson.query";

const mockGetLessonViewInternal = jest.fn();
const mockFindByUserAndCourse = jest.fn();

const mockContentService = {
  getLessonViewInternal: mockGetLessonViewInternal,
};

const mockProgressRepo = {
  findByUserAndCourse: mockFindByUserAndCourse,
};

describe("GetStudentLessonHandler", () => {
  let handler: GetStudentLessonHandler;

  const QUERY = new GetStudentLessonQuery("student-1", "course-1", "lesson-1");

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentLessonHandler,
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: PROGRESS_REPOSITORY,
          useValue: mockProgressRepo,
        },
      ],
    }).compile();

    handler = module.get<GetStudentLessonHandler>(GetStudentLessonHandler);
    jest.clearAllMocks();
  });

  it("should throw NotFoundException if lesson courseId does not match query courseId", async () => {
    mockGetLessonViewInternal.mockResolvedValue({ courseId: "wrong-course-id" });

    await expect(handler.execute(QUERY)).rejects.toThrow(NotFoundException);
    expect(mockGetLessonViewInternal).toHaveBeenCalledWith(QUERY.lessonId);
  });

  it("should return sanitized blocks and apply progress (no truncation needed)", async () => {
    mockGetLessonViewInternal.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Test Lesson",
      goals: "Test goals",
      blocks: [
        {
          blockId: "block-1",
          type: BlockType.Text,
          requiredAction: BlockRequiredAction.VIEW,
          content: { text: "Hello world" },
        },
      ],
    });

    mockFindByUserAndCourse.mockResolvedValue({
      lessons: {
        "lesson-1": {
          completedBlocks: {
            "block-1": {
              status: GradingStatus.GRADED,
              score: 100,
              completedAt: new Date("2026-02-18"),
            },
          },
        },
      },
    });

    const result = await handler.execute(QUERY);

    expect(result.lessonId).toBe("lesson-1");
    expect(result.totalBlocks).toBe(1);
    expect(result.visibleBlocksCount).toBe(1);
    expect(result.blocks[0].progress).toEqual({
      status: GradingStatus.GRADED,
      score: 100,
      feedback: undefined,
      submittedAt: expect.any(Date),
    });
  });

  it("should strip secrets from Code and Quiz blocks", async () => {
    mockGetLessonViewInternal.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Secret Lesson",
      goals: null,
      order: 1,
      isDraft: false,
      blocks: [
        {
          blockId: "code-block",
          type: BlockType.Code,
          requiredAction: BlockRequiredAction.VIEW,
          content: {
            language: "python",
            testCasesCode: "assert True",
            outputData: "expected output",
            taskText: "Write a loop",
          },
        },
        {
          blockId: "quiz-question-block",
          type: BlockType.QuizQuestion,
          requiredAction: BlockRequiredAction.VIEW,
          content: {
            question: { json: { text: "2+2?" } },
            correctAnswerText: "4",
            explanation: "Because math",
            options: [
              { text: "3", isCorrect: false },
              { text: "4", isCorrect: true },
            ],
          },
        },
      ],
    });

    mockFindByUserAndCourse.mockResolvedValue(null);

    const result = await handler.execute(QUERY);

    const codeBlock = result.blocks.find((b: any) => b.blockId === "code-block")!;
    expect(codeBlock.content.testCasesCode).toBeUndefined();
    expect(codeBlock.content.outputData).toBeUndefined();
    expect(codeBlock.content.taskText).toBe("Write a loop");

    const quizBlock = result.blocks.find((b: any) => b.blockId === "quiz-question-block") as any;
    expect(quizBlock.content.correctAnswerText).toBeUndefined();
    expect(quizBlock.content.explanation).toBeUndefined();
    expect(quizBlock.content.options[0].isCorrect).toBeUndefined();
    expect(quizBlock.content.options[1].isCorrect).toBeUndefined();
    expect(quizBlock.content.options[0].text).toBe("3");
  });

  it("should truncate future blocks if an interactive block is NOT completed", async () => {
    mockGetLessonViewInternal.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Truncation Test",
      blocks: [
        { blockId: "text-1", type: BlockType.Text, requiredAction: BlockRequiredAction.VIEW, content: {} },
        {
          blockId: "quiz-1",
          type: BlockType.QuizQuestion,
          requiredAction: BlockRequiredAction.PASS,
          content: { question: { json: {} } },
        },
        { blockId: "text-2", type: BlockType.Text, requiredAction: BlockRequiredAction.VIEW, content: {} },
      ],
    });

    mockFindByUserAndCourse.mockResolvedValue({
      lessons: {
        "lesson-1": {
          completedBlocks: {
            "quiz-1": { status: GradingStatus.PENDING, score: 0 },
          },
        },
      },
    });

    const result = await handler.execute(QUERY);

    expect(result.totalBlocks).toBe(3);
    expect(result.visibleBlocksCount).toBe(2);
    expect(result.blocks.length).toBe(2);
    expect(result.blocks.map((b: any) => b.blockId)).toEqual(["text-1", "quiz-1"]);
  });

  it("should NOT truncate if the interactive block IS successfully completed", async () => {
    mockGetLessonViewInternal.mockResolvedValue({
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Truncation Test Passed",
      blocks: [
        { blockId: "text-1", type: BlockType.Text, requiredAction: BlockRequiredAction.VIEW, content: {} },
        {
          blockId: "quiz-1",
          type: BlockType.QuizQuestion,
          requiredAction: BlockRequiredAction.PASS,
          content: { question: { json: {} } },
        },
        { blockId: "text-2", type: BlockType.Text, requiredAction: BlockRequiredAction.VIEW, content: {} },
      ],
    });

    mockFindByUserAndCourse.mockResolvedValue({
      lessons: {
        "lesson-1": {
          completedBlocks: {
            "quiz-1": { status: GradingStatus.GRADED, score: 100 },
          },
        },
      },
    });

    const result = await handler.execute(QUERY);

    expect(result.totalBlocks).toBe(3);
    expect(result.visibleBlocksCount).toBe(3);
    expect(result.blocks.length).toBe(3);
  });
});
