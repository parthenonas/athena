import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Instructor } from "./entities/instructor.entity";
import { InstructorController } from "./instructor.controller";
import { InstructorService } from "./instructor.service";
import { IdentityModule } from "../../identity";
import { ProfileUpdatedListener } from "./listeners/profile-updated.listener";
import { InstructorView, InstructorViewSchema } from "./schemas/instructor-view.schema";

@Module({
  imports: [
    TypeOrmModule.forFeature([Instructor]),
    MongooseModule.forFeature([{ name: InstructorView.name, schema: InstructorViewSchema }]),
    IdentityModule,
    JwtModule,
  ],
  providers: [InstructorService, JwtService, ProfileUpdatedListener],
  exports: [InstructorService],
  controllers: [InstructorController],
})
export class InstructorModule {}
