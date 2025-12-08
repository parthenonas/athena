import { BlockType } from "@athena/types";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Lesson } from "../../lesson/entities/lesson.entity";

@Entity("blocks")
@Index(["lessonId", "orderIndex"])
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Lesson, lesson => lesson.blocks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lesson_id" })
  lesson!: Lesson;

  @Column({ name: "lesson_id" })
  lessonId!: string;

  @Column({ name: "order_index", type: "double precision", default: 0 })
  orderIndex!: number;

  @Column({ type: "enum", enum: BlockType, default: BlockType.Text })
  type!: BlockType;

  @Column({ type: "jsonb", default: {} })
  content!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
