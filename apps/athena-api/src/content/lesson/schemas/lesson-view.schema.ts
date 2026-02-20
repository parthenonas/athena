import { type BlockContent, BlockRequiredAction, BlockType } from "@athena/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";

export type LessonViewDocument = HydratedDocument<LessonView>;

@Schema({ _id: false })
export class BlockView {
  @Prop({ required: true, index: true })
  blockId!: string;

  @Prop({ type: String, required: true, enum: BlockType })
  type!: BlockType;

  @Prop({ required: true })
  orderIndex!: number;

  @Prop({ type: String, required: true, enum: BlockRequiredAction })
  requiredAction!: BlockRequiredAction;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  content!: BlockContent;
}

export const BlockViewSchema = SchemaFactory.createForClass(BlockView);

@Schema({ collection: "lesson_views", timestamps: true })
export class LessonView {
  @Prop({ required: true, index: true, unique: true })
  lessonId!: string;

  @Prop({ required: true, index: true })
  courseId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ type: String, default: null })
  goals?: string | null;

  @Prop({ required: true })
  order!: number;

  @Prop({ required: true })
  isDraft!: boolean;

  @Prop({ type: [BlockViewSchema], default: [] })
  blocks!: BlockView[];
}

export const LessonViewSchema = SchemaFactory.createForClass(LessonView);
