import { Module } from "@nestjs/common";

import { CohortModule } from "./cohort/cohort.module";
import { EnrollmentModule } from "./enrollment/enrollment.module";
import { InstructorModule } from "./instructor/instructor.module";
import { ProgressModule } from "./progress";
import { ScheduleModule } from "./schedule/schedule.module";

@Module({
  imports: [CohortModule, EnrollmentModule, InstructorModule, ScheduleModule, ProgressModule],
  providers: [],
  exports: [],
})
export class LearningModule {}
