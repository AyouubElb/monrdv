import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './create-app.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Every response carries an x-request-id that also tags its log lines. An incoming id is kept
// only when it is short and plain, so a caller cannot write junk into the logs.
describe('x-request-id', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function healthWith(requestId?: string) {
    const req = request(app.getHttpServer()).get('/api/health');
    return requestId === undefined ? req : req.set('x-request-id', requestId);
  }

  it('creates a UUID when the caller sends none', async () => {
    const res = await healthWith();

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('creates a different id for each request', async () => {
    const first = await healthWith();
    const second = await healthWith();

    expect(first.headers['x-request-id']).not.toBe(
      second.headers['x-request-id'],
    );
  });

  it('keeps a plain incoming id, so a trace can cross from Nginx or the web app', async () => {
    const res = await healthWith('web-7f3a_01');

    expect(res.headers['x-request-id']).toBe('web-7f3a_01');
  });

  it('keeps an incoming id of exactly 64 characters', async () => {
    const id = 'a'.repeat(64);

    const res = await healthWith(id);

    expect(res.headers['x-request-id']).toBe(id);
  });

  it.each([
    ['longer than 64 characters', 'a'.repeat(65)],
    ['with spaces', 'not a plain id'],
    ['with markup', '<script>alert(1)</script>'],
    ['with JSON characters', '{"level":60}'],
    ['empty', ''],
  ])('replaces an incoming id %s with a fresh UUID', async (_case, id) => {
    const res = await healthWith(id);

    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});
