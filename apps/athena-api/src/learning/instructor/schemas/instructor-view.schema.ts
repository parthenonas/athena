import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type InstructorViewDocument = HydratedDocument<InstructorView>;

@Schema({ collection: "instructor_views", timestamps: true })
export class InstructorView {
  @Prop({ required: true, index: true, unique: true })
  instructorId!: string;

  @Prop({ required: true, index: true, unique: true })
  ownerId!: string;

  @Prop({ default: "" })
  firstName!: string;

  @Prop({ default: "" })
  lastName!: string;

  @Prop({ default: "" })
  patronymic!: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ default: "" })
  title!: string;

  @Prop({ default: "" })
  bio!: string;
}

export const InstructorViewSchema = SchemaFactory.createForClass(InstructorView);
