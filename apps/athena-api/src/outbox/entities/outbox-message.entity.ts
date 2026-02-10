import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("outbox_messages")
export class OutboxMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: string;

  @Column("jsonb")
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
