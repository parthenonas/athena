export class ProfileUpdatedEvent {
  constructor(
    public readonly ownerId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly patronymic: string,
    public readonly avatarUrl?: string | null,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
