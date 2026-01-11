import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Instructor } from "./entities/instructor.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Instructor])],
  providers: [],
  exports: [],
})
export class InstructorModule {}
