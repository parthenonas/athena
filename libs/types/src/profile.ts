export interface ProfileMetadata {
  [key: string]: unknown;
}

export interface CreateProfileRequest {
  firstName: string;
  lastName: string;
  patronymic?: string;
  avatarUrl?: string;
  birthDate?: Date;
  metadata?: ProfileMetadata;
}

export interface UpdateProfileRequest extends Partial<CreateProfileRequest> {}

export interface ProfileResponse {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  birthDate?: Date;
  metadata: ProfileMetadata;
  createdAt: Date;
  updatedAt: Date;
}
