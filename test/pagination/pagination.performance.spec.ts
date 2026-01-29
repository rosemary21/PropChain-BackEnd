import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '../../src/common/pagination/pagination.service';
import { PaginationQueryDto } from '../../src/common/pagination/pagination.dto';

describe('Pagination Service - Performance Tests', () => {
  let service: PaginationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  describe('Performance with Large Datasets', () => {
    it('should efficiently calculate pagination for 1 million items', () => {
      const total = 1_000_000;
      const start = Date.now();

      const meta = service.createMetadata(total, 50000, 20);

      const duration = Date.now() - start;

      expect(meta.total).toBe(total);
      expect(meta.pages).toBe(50000);
      expect(duration).toBeLessThan(5); // Should complete in less than 5ms
    });

    it('should efficiently format response for large dataset', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      const query: PaginationQueryDto = { page: 1, limit: 100 };

      const start = Date.now();

      const response = service.formatResponse(data, 1_000_000, query);

      const duration = Date.now() - start;

      expect(response.data).toHaveLength(100);
      expect(response.meta.total).toBe(1_000_000);
      expect(duration).toBeLessThan(5);
    });

    it('should handle rapid consecutive pagination queries', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        service.calculatePagination(i % 100 + 1, (i % 10) * 10 + 10);
      }

      const duration = Date.now() - start;

      // Should handle 1000 pagination calculations in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should efficiently generate Prisma options for many queries', () => {
      const iterations = 500;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const query: PaginationQueryDto = {
          page: (i % 10) + 1,
          limit: ((i % 5) + 1) * 20,
          sortBy: i % 2 === 0 ? 'createdAt' : 'name',
          sortOrder: i % 2 === 0 ? 'asc' : 'desc',
        };
        service.getPrismaOptions(query);
      }

      const duration = Date.now() - start;

      // Should handle 500 Prisma option generation in less than 20ms
      expect(duration).toBeLessThan(20);
    });

    it('should calculate metadata efficiently for extreme pagination values', () => {
      const extremeCases = [
        { total: Number.MAX_SAFE_INTEGER, page: 1, limit: 100 },
        { total: 1_000_000_000, page: 10_000_000, limit: 100 },
        { total: 2_000_000_000, page: 1, limit: 1 }, // min limit
      ];

      const start = Date.now();

      extremeCases.forEach(({ total, page, limit }) => {
        service.createMetadata(total, page, limit);
      });

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should memory-efficiently handle large format operations', () => {
      // Create a moderately large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        email: `item${i}@example.com`,
        createdAt: new Date(),
        status: i % 3,
      }));

      const query: PaginationQueryDto = { page: 1, limit: 1000 };
      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        service.formatResponse(largeDataset, 100_000, query);
      }

      const duration = Date.now() - start;

      // Should handle 10 large format operations quickly
      expect(duration).toBeLessThan(30);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle pagination for single item efficiently', () => {
      const start = Date.now();

      const meta = service.createMetadata(1, 1, 100);

      const duration = Date.now() - start;

      expect(meta.pages).toBe(1);
      expect(duration).toBeLessThan(1);
    });

    it('should handle pagination for exactly one page of items', () => {
      const start = Date.now();

      const meta = service.createMetadata(10, 1, 10);

      const duration = Date.now() - start;

      expect(meta.pages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(duration).toBeLessThan(1);
    });

    it('should handle very high page numbers efficiently', () => {
      const start = Date.now();

      const meta = service.createMetadata(10_000_000, 1_000_000, 10);

      const duration = Date.now() - start;

      expect(meta.pages).toBe(1_000_000);
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Benchmark Results', () => {
    it('should provide performance summary', () => {
      const benchmarks = {
        'Simple pagination (page 1, limit 10)': () =>
          service.calculatePagination(1, 10),
        'Complex pagination (page 500, limit 50)': () =>
          service.calculatePagination(500, 50),
        'Metadata generation (100 items)': () =>
          service.createMetadata(100, 1, 10),
        'Metadata generation (1M items)': () =>
          service.createMetadata(1_000_000, 1, 10),
        'Parse query': () =>
          service.parsePaginationQuery({ page: 2, limit: 20 }),
        'Prisma options': () =>
          service.getPrismaOptions({ page: 1, limit: 10 }),
      };

      console.log('\n📊 Pagination Service Performance Benchmarks:');
      console.log('─'.repeat(50));

      Object.entries(benchmarks).forEach(([name, fn]) => {
        const start = process.hrtime.bigint();
        for (let i = 0; i < 10000; i++) {
          fn();
        }
        const end = process.hrtime.bigint();
        const avgNs = Number(end - start) / 10000;
        const avgMs = avgNs / 1_000_000;
        console.log(`${name.padEnd(40)} ${avgMs.toFixed(4)}ms (10k iterations)`);
      });
      console.log('─'.repeat(50));
    });
  });
});
