# Pagination Implementation Guide

## Overview

This document describes the standardized pagination implementation across all list endpoints in the PropChain Backend API.

## Architecture

### Components

1. **PaginationQueryDto** - Query parameter validation
2. **PaginationMetadataDto** - Response metadata structure
3. **PaginatedResponseDto** - Generic paginated response wrapper
4. **PaginationService** - Core pagination logic

### Directory Structure

```
src/common/pagination/
├── index.ts                 # Exports
├── pagination.dto.ts        # DTOs and types
└── pagination.service.ts    # Service implementation

test/pagination/
├── pagination.service.spec.ts         # Unit tests
├── api-keys.pagination.spec.ts        # Integration tests
└── pagination.performance.spec.ts     # Performance tests
```

## Usage

### Basic Controller Setup

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto, PaginatedResponseDto } from '../common/pagination';

@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get()
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ItemDto>> {
    return this.itemsService.findAll(paginationQuery);
  }
}
```

### Service Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { PaginationService, PaginationQueryDto, PaginatedResponseDto } from '../common/pagination';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<ItemDto[] | PaginatedResponseDto<ItemDto>> {
    if (!paginationQuery) {
      // Backward compatibility: return all items without pagination
      return this.prisma.item.findMany();
    }

    // Get Prisma query options with pagination and sorting
    const { skip, take, orderBy } = this.paginationService.getPrismaOptions(
      paginationQuery,
      'createdAt', // default sort field
    );

    // Fetch items and total count in parallel
    const [items, total] = await Promise.all([
      this.prisma.item.findMany({ skip, take, orderBy }),
      this.prisma.item.count(),
    ]);

    // Format response with metadata
    return this.paginationService.formatResponse(items, total, paginationQuery);
  }
}
```

### Module Setup

```typescript
import { Module } from '@nestjs/common';
import { PaginationService } from '../common/pagination';

@Module({
  providers: [PaginationService, ItemsService],
  controllers: [ItemsController],
})
export class ItemsModule {}
```

## Query Parameters

All list endpoints support the following query parameters:

| Parameter  | Type     | Default | Min | Max | Description |
|-----------|----------|---------|-----|-----|-------------|
| `page`    | integer  | 1       | 1   | ∞   | Page number (1-indexed) |
| `limit`   | integer  | 10      | 1   | 100 | Items per page |
| `sortBy`  | string   | createdAt | - | - | Field to sort by |
| `sortOrder` | enum   | desc    | - | - | Sort direction (asc or desc) |

## Response Format

### Success Response (200)

```json
{
  "data": [
    {
      "id": "123",
      "name": "Example Item",
      "createdAt": "2026-01-29T12:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "pages": 15,
    "hasNext": true,
    "hasPrev": false,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

### Pagination Metadata Fields

| Field     | Type    | Description |
|-----------|---------|-------------|
| `total`   | number  | Total number of items matching the query |
| `page`    | number  | Current page number |
| `limit`   | number  | Items per page |
| `pages`   | number  | Total number of pages |
| `hasNext` | boolean | Whether a next page exists |
| `hasPrev` | boolean | Whether a previous page exists |
| `sortBy`  | string  | Field used for sorting |
| `sortOrder` | enum  | Sort direction (asc or desc) |

## API Examples

### Get First Page (Default)
```bash
curl https://api.propchain.io/api-keys
```

### Get Second Page with 20 Items Per Page
```bash
curl "https://api.propchain.io/api-keys?page=2&limit=20"
```

### Sort by Name in Ascending Order
```bash
curl "https://api.propchain.io/api-keys?page=1&limit=10&sortBy=name&sortOrder=asc"
```

### Get Maximum Items Per Page
```bash
curl "https://api.propchain.io/api-keys?page=1&limit=100"
```

## Client-Side Integration

### JavaScript/TypeScript Example

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function getApiKeys(params: PaginationParams = {}) {
  const queryParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
  });

  const response = await fetch(`/api-keys?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.json();
}

// Usage
const { data, meta } = await getApiKeys({ page: 2, limit: 20 });

// Navigate to next page
if (meta.hasNext) {
  const nextPage = await getApiKeys({ page: meta.page + 1 });
}
```

## Validation & Constraints

### Automatic Enforcement

- **Page**: Minimum of 1 (lower values default to 1)
- **Limit**: Enforced between 1 and 100 (exceeding max defaults to 100)
- **SortOrder**: Only accepts 'asc' or 'desc' (defaults to 'desc')

### Example Invalid Request Handling

```
Request: GET /api-keys?page=0&limit=200
Applied: page=1, limit=100
```

## Performance Characteristics

### Benchmarks (on modern hardware)

- Single pagination calculation: **<0.001ms**
- Metadata generation (1M items): **<1ms**
- Format response operation: **<1ms**
- 1000 pagination queries: **<50ms**

### Optimization Tips

1. **Always fetch total count and items in parallel**
   ```typescript
   const [items, total] = await Promise.all([
     this.prisma.item.findMany({ skip, take }),
     this.prisma.item.count(),
   ]);
   ```

2. **Add database indexes on sort fields**
   ```sql
   CREATE INDEX idx_items_created_at ON items(created_at);
   CREATE INDEX idx_items_name ON items(name);
   ```

3. **Use appropriate limits**
   - Default (10): Good for most APIs
   - Max (100): For data-heavy endpoints

4. **Consider caching for static lists**
   ```typescript
   if (!paginationQuery?.page || paginationQuery.page === 1) {
     return this.cache.get('items:page:1') ?? 
            this.fetchAndCacheFirstPage();
   }
   ```

## Testing

### Unit Tests
```bash
npm run test -- pagination.service.spec.ts
```

### Integration Tests
```bash
npm run test -- api-keys.pagination.spec.ts
```

### Performance Tests
```bash
npm run test -- pagination.performance.spec.ts
```

## Migration Guide

### Updating Existing Endpoints

1. **Add PaginationService to module**
   ```typescript
   @Module({
     providers: [ItemsService, PaginationService],
   })
   ```

2. **Update service method signature**
   ```typescript
   // Before
   async findAll(): Promise<ItemDto[]>

   // After
   async findAll(query?: PaginationQueryDto): Promise<ItemDto[] | PaginatedResponseDto<ItemDto>>
   ```

3. **Update controller method signature**
   ```typescript
   // Before
   @Get()
   findAll(): Promise<ItemDto[]>

   // After
   @Get()
   findAll(@Query() query: PaginationQueryDto): Promise<ItemDto[] | PaginatedResponseDto<ItemDto>>
   ```

4. **Update service implementation** (see Service Implementation section)

## Common Issues & Solutions

### Issue: "Can't resolve dependencies of PaginationService"
**Solution**: Ensure `PaginationService` is provided in the module's `providers` array.

### Issue: Maximum limit not enforced
**Solution**: Always use `getPrismaOptions()` or `calculatePagination()` instead of manual offset calculations.

### Issue: Inconsistent sort results
**Solution**: Ensure the sort field exists in the model and add appropriate database indexes.

### Issue: Slow pagination queries
**Solution**: 
- Add indexes on sort fields
- Fetch items and count in parallel
- Consider implementing cursor-based pagination for large datasets

## Future Enhancements

1. **Cursor-based Pagination**: For better performance with large datasets
2. **Keyset Pagination**: For stable pagination with frequently updated data
3. **Search Integration**: Combined search and pagination support
4. **Caching Layer**: Automatic caching of popular pages
5. **Export Functionality**: Export all results as CSV/JSON

## References

- [REST API Pagination Best Practices](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Pagination-Best-Practices/)
- [Prisma Pagination Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/pagination)
- [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation)
