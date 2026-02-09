import { InstructorView } from "@athena/types";
import { Expose } from "class-transformer";

export class ReadInstructorViewDto implements InstructorView {
  @Expose()
  instructorId!: string;

  @Expose()
  ownerId!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  title!: string;

  @Expose()
  bio!: string;
}
