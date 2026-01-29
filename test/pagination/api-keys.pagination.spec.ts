import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiKeysModule } from '../../src/api-keys/api-keys.module';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { RedisService } from '../../src/common/services/redis.service';
import { JwtService } from '@nestjs/jwt';

describe('API Keys Pagination Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let jwtService: JwtService;

  const mockToken = 'mock-jwt-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiKeysModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        apiKey: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          count: jest.fn(),
          delete: jest.fn(),
        },
      })
      .overrideProvider(RedisService)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        setex: jest.fn(),
      })
      .overrideProvider(JwtService)
      .useValue({
        sign: jest.fn().mockReturnValue(mockToken),
        verify: jest.fn().mockReturnValue({ sub: 'test-user' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api-keys - Pagination Integration', () => {
    const mockApiKeys = Array.from({ length: 50 }, (_, i) => ({
      id: `key-${i + 1}`,
      name: `API Key ${i + 1}`,
      keyPrefix: `propchain_${String(i + 1).padStart(5, '0')}`,
      scopes: ['read'],
      requestCount: i,
      lastUsedAt: new Date(),
      isActive: true,
      rateLimit: 60,
      createdAt: new Date(Date.now() - i * 1000000),
      updatedAt: new Date(),
      key: 'encrypted-key',
    }));

    it('should return paginated API keys with metadata for first page', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(0, 10));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=10',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(10);
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBe(50);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.pages).toBe(5);
      expect(body.meta.hasNext).toBe(true);
      expect(body.meta.hasPrev).toBe(false);
    });

    it('should return correct metadata for middle page', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(20, 30));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=3&limit=10',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.page).toBe(3);
      expect(body.meta.hasNext).toBe(true);
      expect(body.meta.hasPrev).toBe(true);
    });

    it('should return correct metadata for last page', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(40, 50));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=5&limit=10',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.page).toBe(5);
      expect(body.meta.hasNext).toBe(false);
      expect(body.meta.hasPrev).toBe(true);
    });

    it('should handle custom limit', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(0, 20));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=20',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.limit).toBe(20);
      expect(body.meta.pages).toBe(3);
    });

    it('should enforce maximum limit of 100', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys);
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=200',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.limit).toBe(100);
    });

    it('should handle sorting by custom field', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(0, 10));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=10&sortBy=name&sortOrder=asc',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.sortBy).toBe('name');
      expect(body.meta.sortOrder).toBe('asc');
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=10',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
      expect(body.meta.pages).toBe(0);
    });

    it('should use defaults when no query parameters provided', async () => {
      jest.spyOn(prismaService.apiKey, 'findMany').mockResolvedValue(mockApiKeys.slice(0, 10));
      jest.spyOn(prismaService.apiKey, 'count').mockResolvedValue(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
        headers: { authorization: `Bearer ${mockToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.sortBy).toBe('createdAt');
      expect(body.meta.sortOrder).toBe('desc');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys?page=1&limit=10',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
