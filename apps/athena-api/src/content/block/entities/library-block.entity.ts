import { type BlockContent, BlockType, Ownable } from "@athena/types";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("library_blocks")
export class LibraryBlock implements Ownable {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "owner_id", type: "uuid" })
  @Index()
  ownerId!: string;

  @Column({ type: "enum", enum: BlockType, default: BlockType.Text })
  type!: BlockType;

  @Column({ type: "text", array: true, default: [] })
  tags!: string[];

  @Column({ type: "jsonb", default: {} })
  content!: BlockContent;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
