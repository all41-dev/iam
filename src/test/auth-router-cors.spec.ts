import { expect } from 'chai';
import crypto from 'crypto';
import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { AuthManager } from '../auth/auth-manager';
import 'mocha';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

describe('auth router CORS option', () => {
  let http: Server;
  let base: string;

  /** A fresh manager and router with the given options, served on a free port. */
  const serve = (options: { cors?: boolean }) => {
    (AuthManager as any).instance = undefined;
    const router = AuthManager.getInstance({ publicKey, privateKey, strategies: {}, ...options }).init();
    const app = express();
    app.use('/auth', router);
    http = app.listen(0);
    base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  };

  afterEach((done) => {
    (AuthManager as any).instance = undefined;
    http.close(() => done());
  });

  it('answers CORS itself by default, as before', async () => {
    serve({});
    const res = await fetch(`${base}/auth/profile`, { headers: { Origin: 'https://app.example.com' } });
    expect(res.headers.get('access-control-allow-origin')).to.equal('*');
    expect(res.headers.get('access-control-allow-credentials')).to.equal('true');
  });

  it('writes no CORS header when the host owns CORS', async () => {
    serve({ cors: false });
    const res = await fetch(`${base}/auth/profile`, { headers: { Origin: 'https://app.example.com' } });
    expect(res.status).to.equal(401);
    expect(res.headers.get('access-control-allow-origin')).to.equal(null);
    expect(res.headers.get('access-control-allow-credentials')).to.equal(null);
  });
});
