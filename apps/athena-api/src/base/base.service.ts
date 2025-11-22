import { plainToInstance } from "class-transformer";

/**
 * BaseService
 *
 * Generic helper for mapping TypeORM entities → DTOs using class-transformer.
 * Works with ANY DTO class passed explicitly to `toDto()` or `toDtoArray()`.
 */
export abstract class BaseService<TEntity> {
  /**
   * Map a single entity to a DTO.
   */
  protected toDto<T>(entity: TEntity, dtoClass: new () => T): T {
    return plainToInstance(dtoClass, entity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Map an array of entities to an array of DTOs.
   */
  protected toDtoArray<T>(entities: TEntity[], dtoClass: new () => T): T[] {
    return entities.map(e => this.toDto(e, dtoClass));
  }
}
