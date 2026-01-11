import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Instructor } from "./entities/instructor.entity";
import { InstructorService } from "./instructor.service";
import { IdentityModule } from "../../identity";

@Module({
  imports: [TypeOrmModule.forFeature([Instructor]), IdentityModule],
  providers: [InstructorService],
  exports: [InstructorService],
})
export class InstructorModule {}
