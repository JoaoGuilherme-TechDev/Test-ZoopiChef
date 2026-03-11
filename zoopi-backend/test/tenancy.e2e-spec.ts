import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Tenancy (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admnistrador
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admnistrador@zoopi.com.br',
        password: 'admin123',
      });

    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow access to categories with zoopi-chef slug', async () => {
    const response = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', 'zoopi-chef');

    expect(response.status).toBe(200);
  });

  it('should deny access to categories with invalid slug', async () => {
    const response = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-slug', 'invalid-slug');

    expect(response.status).toBe(403);
  });

  it('should allow public access to tablet menu via slug', async () => {
    const response = await request(app.getHttpServer()).get(
      '/public/company/zoopi-chef/menu',
    );

    expect(response.status).toBe(200);
    expect(response.body.company.slug).toBe('zoopi-chef');
  });

  it('should deny public access to tablet menu with invalid slug', async () => {
    const response = await request(app.getHttpServer()).get(
      '/public/company/invalid-slug/menu',
    );

    expect(response.status).toBe(404);
  });
});
