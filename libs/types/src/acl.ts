export enum Permission {
  ACCOUNTS_CREATE = "accounts.create",
  ACCOUNTS_READ = "accounts.read",
  ACCOUNTS_UPDATE = "accounts.update",
  ACCOUNTS_DELETE = "accounts.delete",

  PROFILES_CREATE = "profiles.create",
  PROFILES_READ = "profiles.read",
  PROFILES_UPDATE = "profiles.update",
  PROFILES_DELETE = "profiles.delete",

  COURSES_CREATE = "courses.create",
  COURSES_READ = "courses.read",
  COURSES_UPDATE = "courses.update",
  COURSES_DELETE = "courses.delete",
  COURSES_PUBLISH = "courses.publish",

  LESSONS_CREATE = "lessons.create",
  LESSONS_READ = "lessons.read",
  LESSONS_UPDATE = "lessons.update",
  LESSONS_DELETE = "lessons.delete",

  STEPS_CREATE = "steps.create",
  STEPS_READ = "steps.read",
  STEPS_UPDATE = "steps.update",
  STEPS_DELETE = "steps.delete",

  BLOCKS_CREATE = "blocks.create",
  BLOCKS_READ = "blocks.read",
  BLOCKS_UPDATE = "blocks.update",
  BLOCKS_DELETE = "blocks.delete",
  BLOCKS_EXECUTE = "blocks.execute",

  BLOCK_TRANSITIONS_CREATE = "block_transitions.create",
  BLOCK_TRANSITIONS_READ = "block_transitions.read",
  BLOCK_TRANSITIONS_UPDATE = "block_transitions.update",
  BLOCK_TRANSITIONS_DELETE = "block_transitions.delete",

  PROGRESS_CREATE = "progress.create",
  PROGRESS_READ = "progress.read",
  PROGRESS_UPDATE = "progress.update",
  PROGRESS_DELETE = "progress.delete",

  ENROLLMENTS_CREATE = "enrollments.create",
  ENROLLMENTS_READ = "enrollments.read",
  ENROLLMENTS_UPDATE = "enrollments.update",
  ENROLLMENTS_DELETE = "enrollments.delete",

  SCHEDULE_CREATE = "schedule.create",
  SCHEDULE_READ = "schedule.read",
  SCHEDULE_UPDATE = "schedule.update",
  SCHEDULE_DELETE = "schedule.delete",

  ADMIN = "admin",
}

export enum Policy {
  OWN_ONLY = "own_only",
  NOT_PUBLISHED = "not_published",
}
