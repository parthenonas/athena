import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { IProgressRepository } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";
import { ProgressMapper } from "../mappers/progress.mapper";

/**
 * @class TypeOrmProgressRepository
 * @description
 * Concrete implementation of the Progress Repository using TypeORM.
 *
 * Responsibilities:
 * - Persistence: Saving Aggregate roots to the SQL database.
 * - Rehydration: Loading raw SQL rows and converting them back into Domain Aggregates.
 * - Mapping: Uses `ProgressMapper` to translate between Domain and Persistence models.
 *
 * Note:
 * This class isolates the Domain layer from the Database layer. The Domain doesn't know
 * that TypeORM exists.
 */
@Injectable()
export class TypeOrmProgressRepository implements IProgressRepository {
  constructor(
    @InjectRepository(ProgressOrmEntity)
    private readonly repo: Repository<ProgressOrmEntity>,
  ) {}

  /**
   * Persists the current state of the StudentProgress aggregate.
   */
  async save(progress: StudentProgress): Promise<void> {
    const entity = ProgressMapper.toPersistence(progress);
    await this.repo.save(entity);
  }

  /**
   * Finds progress by Enrollment ID (Unique per student per course).
   */
  async findByEnrollmentId(enrollmentId: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { enrollmentId } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }

  /**
   * Finds progress by its UUID.
   */
  async findById(id: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }

  /**
   * Finds progress by composite key (Student + Course).
   */
  async findByUserAndCourse(userId: string, courseId: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { studentId: userId, courseId: courseId } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }

  /**
   * Deletes a progress record by its UUID.
   */
  async deleteByEnrollmentId(enrollmentId: string): Promise<void> {
    await this.repo.delete({ enrollmentId });
  }
}
