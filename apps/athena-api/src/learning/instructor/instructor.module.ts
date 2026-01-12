import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Instructor } from "./entities/instructor.entity";
import { InstructorController } from "./instructor.controller";
import { InstructorService } from "./instructor.service";
import { IdentityModule } from "../../identity";

@Module({
  imports: [TypeOrmModule.forFeature([Instructor]), IdentityModule],
  providers: [InstructorService],
  exports: [InstructorService],
  controllers: [InstructorController],
})
export class InstructorModule {}
