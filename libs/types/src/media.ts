import { SortOrder } from "./common";

export enum FileAccess {
  /**
   * File is accessible to everyone via direct link.
   * Used for: avatars, course covers, landing page assets.
   */
  Public = "public",

  /**
   * File is protected and requires authorization to access.
   * Used for: homeworks, course materials, personal documents.
   */
  Private = "private",
}

export interface FileResponse {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  access: FileAccess;
  ownerId: string;
  createdAt: Date;
}

export interface FilterFileRequest {
  search?: string;
  type?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
  sortBy: "originalName" | "size" | "createdAt";
  sortOrder: SortOrder;
}
