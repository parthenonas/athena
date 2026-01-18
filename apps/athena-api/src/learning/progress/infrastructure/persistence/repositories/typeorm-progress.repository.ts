import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { IProgressRepository } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";
import { ProgressMapper } from "../mappers/progress.mapper";

@Injectable()
export class TypeOrmProgressRepository implements IProgressRepository {
  constructor(
    @InjectRepository(ProgressOrmEntity)
    private readonly repo: Repository<ProgressOrmEntity>,
  ) {}

  async save(progress: StudentProgress): Promise<void> {
    const entity = ProgressMapper.toPersistence(progress);
    await this.repo.save(entity);
  }

  async findByEnrollmentId(enrollmentId: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { enrollmentId } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }

  async findById(id: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<StudentProgress | null> {
    const entity = await this.repo.findOne({ where: { studentId: userId, courseId: courseId } });
    if (!entity) return null;
    return ProgressMapper.toDomain(entity);
  }
}
