import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { TypeOrmProgressRepository } from "./typeorm-progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";
import { ProgressMapper } from "../mappers/progress.mapper";

const mockRepo = {
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockDomainObject = { id: "dom-1" } as unknown as StudentProgress;
const mockOrmEntity = { id: "orm-1" } as unknown as ProgressOrmEntity;

describe("TypeOrmProgressRepository", () => {
  let repository: TypeOrmProgressRepository;
  let typeOrmRepo: Repository<ProgressOrmEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmProgressRepository,
        {
          provide: getRepositoryToken(ProgressOrmEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<TypeOrmProgressRepository>(TypeOrmProgressRepository);
    typeOrmRepo = module.get(getRepositoryToken(ProgressOrmEntity));

    jest.clearAllMocks();
  });

  describe("save", () => {
    it("should map domain to entity and save it", async () => {
      const mapSpy = jest.spyOn(ProgressMapper, "toPersistence").mockReturnValue(mockOrmEntity);

      await repository.save(mockDomainObject);

      expect(mapSpy).toHaveBeenCalledWith(mockDomainObject);
      expect(typeOrmRepo.save).toHaveBeenCalledWith(mockOrmEntity);
    });
  });

  describe("findByEnrollmentId", () => {
    it("should return Domain Object if entity found", async () => {
      mockRepo.findOne.mockResolvedValue(mockOrmEntity);
      const mapSpy = jest.spyOn(ProgressMapper, "toDomain").mockReturnValue(mockDomainObject);

      const result = await repository.findByEnrollmentId("enrollment-1");

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { enrollmentId: "enrollment-1" } });
      expect(mapSpy).toHaveBeenCalledWith(mockOrmEntity);
      expect(result).toBe(mockDomainObject);
    });

    it("should return null if not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByEnrollmentId("enrollment-1");

      expect(result).toBeNull();
    });
  });

  describe("findByUserAndCourse", () => {
    it("should return Domain Object if entity found", async () => {
      mockRepo.findOne.mockResolvedValue(mockOrmEntity);
      const mapSpy = jest.spyOn(ProgressMapper, "toDomain").mockReturnValue(mockDomainObject);

      const result = await repository.findByUserAndCourse("u1", "c1");

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { studentId: "u1", courseId: "c1" } });
      expect(mapSpy).toHaveBeenCalledWith(mockOrmEntity);
      expect(result).toBe(mockDomainObject);
    });

    it("should return null if not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByUserAndCourse("u1", "c1");

      expect(result).toBeNull();
    });
  });
});
