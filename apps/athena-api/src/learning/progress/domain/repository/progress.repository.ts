import { StudentProgress } from "../student-progress.model";

export const PROGRESS_REPOSITORY = Symbol("PROGRESS_REPOSITORY");

export interface IProgressRepository {
  save(progress: StudentProgress): Promise<void>;
  findByEnrollmentId(enrollmentId: string): Promise<StudentProgress | null>;
  findById(id: string): Promise<StudentProgress | null>;
}
