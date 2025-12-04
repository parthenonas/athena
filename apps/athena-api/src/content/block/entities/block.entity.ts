import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Lesson } from "../../lesson/entities/lesson.entity";

/**
 * @Entity Block
 * Represents a single piece of structured content (Notion-style).
 *
 * Blocks form a doubly-linked tree:
 * - parent_block_id → nesting
 * - prev_block_id / next_block_id → ordering
 *
 * Each block stores its value in JSON ("data"),
 * which varies by block type: text, image, quiz, code, etc.
 */
@Entity("blocks")
export class Block {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "blocks__id__pk" })
  id!: string;

  /**
   * Parent lesson.
   */
  @ManyToOne(() => Lesson, lesson => lesson.blocks)
  @JoinColumn({ name: "lesson_id", foreignKeyConstraintName: "blocks__lesson_id__fk" })
  lesson!: Lesson;

  @Column({ name: "lesson_id" })
  lessonId!: string;

  /**
   * Parent block (for nesting).
   * Null → this block is a root-level block of the lesson.
   */
  @ManyToOne(() => Block, block => block.children, { nullable: true })
  @JoinColumn({ name: "parent_block_id", foreignKeyConstraintName: "blocks__parent_block_id__fk" })
  parent!: Block | null;

  @Column({ name: "parent_block_id", nullable: true })
  parentBlockId!: string | null;

  /**
   * Doubly-linked list: previous block.
   */
  @ManyToOne(() => Block, { nullable: true })
  @JoinColumn({ name: "prev_block_id", foreignKeyConstraintName: "blocks__prev_block_id__fk" })
  prev!: Block | null;

  @Column({ name: "prev_block_id", nullable: true })
  prevBlockId!: string | null;

  /**
   * Doubly-linked list: next block.
   */
  @ManyToOne(() => Block, { nullable: true })
  @JoinColumn({ name: "next_block_id", foreignKeyConstraintName: "blocks__next_block_id__fk" })
  next!: Block | null;

  @Column({ name: "next_block_id", nullable: true })
  nextBlockId!: string | null;

  /**
   * Block type: text, image, quiz, code, file, video, etc.
   */
  @Column({ type: "varchar" })
  type!: string;

  /**
   * Block payload (varies by type).
   * Examples:
   * - text: { html, raw_text }
   * - quiz: { question, answers, correct }
   * - image: { url, caption }
   * - code: { language, content }
   */
  @Column({ type: "jsonb" })
  data!: Record<string, unknown>;

  /**
   * Raw text for full-text search indexing.
   */
  @Column({ type: "text", nullable: true })
  rawText!: string | null;

  /**
   * Child blocks (recursive nesting).
   */
  @OneToMany(() => Block, block => block.parent)
  children!: Block[];

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt!: Date | null;
}
