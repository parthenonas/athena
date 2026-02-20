import { StudentProgress } from "../student-progress.model";

export const PROGRESS_REPOSITORY = Symbol("PROGRESS_REPOSITORY");

/**
 * @interface IProgressRepository
 * @description
 * Defines the contract for accessing `StudentProgress` aggregates.
 * Implements the **Repository Pattern** from DDD.
 *
 * Principles:
 * - Collection-oriented: Treats the database as an in-memory collection of objects.
 * - Abstraction: Hides the underlying storage mechanism (TypeORM/SQL).
 */
export interface IProgressRepository {
  /**
   * Persists the current state of the aggregate.
   * Should handle both Insert (new) and Update (existing).
   */
  save(progress: StudentProgress): Promise<void>;

  /**
   * Finds a progress record by the unique Enrollment ID.
   * Guaranteed to be unique (1 Enrollment = 1 Progress).
   */
  findByEnrollmentId(enrollmentId: string): Promise<StudentProgress | null>;

  /**
   * Finds a progress record by its UUID.
   */
  findById(id: string): Promise<StudentProgress | null>;

  /**
   * Finds a progress record by the composite key of User + Course.
   */
  findByUserAndCourse(userId: string, courseId: string): Promise<StudentProgress | null>;

  /**
   * Deletes a progress record by its UUID.
   */
  deleteByEnrollmentId(enrollmentId: string): Promise<void>;
}
