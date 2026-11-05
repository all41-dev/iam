import { expect } from 'chai';
import { Request } from 'express';
import { allowedLanding } from '../auth/landing';
import { IAuthOptions } from '../interfaces';
import 'mocha';

describe('allowedLanding', () => {
  const req = {
    protocol: 'https',
    hostname: 'auth.example.com',
    get: (header: string) => (header === 'host' ? 'auth.example.com' : ''),
  } as unknown as Request;

  const options = (extra: Partial<IAuthOptions> = {}): IAuthOptions => ({
    publicKey: 'key',
    strategies: {},
    ...extra,
  });

  const listed = options({ allowedRedirectHosts: ['app.example.com', 'legacy.example.com:8443', 'http://dev.example.com'] });

  const href = (value: unknown, opts: IAuthOptions = listed) => allowedLanding(value, req, opts)?.href ?? null;

  it('resolves a path against the auth host', () => {
    expect(href('/home?x=1')).to.equal('https://auth.example.com/home?x=1');
  });

  it('accepts the auth host on another port and over http', () => {
    expect(href('https://auth.example.com:8443/front/')).to.equal('https://auth.example.com:8443/front/');
    expect(href('http://auth.example.com/front/')).to.equal('http://auth.example.com/front/');
  });

  it('compares the auth host without case', () => {
    const upper = { ...req, hostname: 'AUTH.example.com' } as unknown as Request;
    expect(allowedLanding('https://auth.example.com/x', upper, options())).to.not.equal(null);
  });

  it('accepts a listed host over https only', () => {
    expect(href('https://app.example.com/home')).to.equal('https://app.example.com/home');
    expect(href('https://APP.example.com/home')).to.equal('https://app.example.com/home');
    expect(href('http://app.example.com/home')).to.equal(null);
  });

  it('matches a listed host with its port', () => {
    expect(href('https://legacy.example.com:8443/front/')).to.not.equal(null);
    expect(href('https://legacy.example.com/front/')).to.equal(null);
    expect(href('https://app.example.com:8443/home')).to.equal(null);
  });

  it('matches a listed origin with its scheme', () => {
    expect(href('http://dev.example.com/home')).to.not.equal(null);
    expect(href('https://dev.example.com/home')).to.equal(null);
    expect(href('http://dev.example.com:3333/home')).to.equal(null);
  });

  it('accepts the origins of redirectAfterLogin and redirectAfterLogout without an entry', () => {
    const configured = options({
      redirectAfterLogin: 'https://front.example.com/home',
      redirectAfterLogout: 'http://out.example.com/bye',
    });
    expect(href('https://front.example.com/other', configured)).to.not.equal(null);
    expect(href('http://out.example.com/', configured)).to.not.equal(null);
    expect(href('http://front.example.com/other', configured)).to.equal(null);
  });

  it('takes nothing from a configured landing that is a path', () => {
    const configured = options({ redirectAfterLogin: '/home' });
    expect(href('https://front.example.com/', configured)).to.equal(null);
    expect(href('/home', configured)).to.equal('https://auth.example.com/home');
  });

  it('refuses every other host when nothing is listed', () => {
    expect(href('https://app.example.com/home', options())).to.equal(null);
  });

  it('refuses a host that only resembles a listed one', () => {
    expect(href('https://app.example.com.evil.example/home')).to.equal(null);
    expect(href('https://evil-app.example.com/home')).to.equal(null);
    expect(href('https://evil.example/app.example.com')).to.equal(null);
  });

  it('refuses a scheme-relative path, a backslash path and credentials before another host', () => {
    expect(href('//evil.example/home')).to.equal(null);
    expect(href('/\\evil.example/home')).to.equal(null);
    expect(href('https://app.example.com@evil.example/home')).to.equal(null);
  });

  it('refuses a scheme that is not http or https', () => {
    expect(href('javascript:alert(1)')).to.equal(null);
    expect(href('data:text/html,x')).to.equal(null);
  });

  it('answers null for nothing, for a value that is not a string and for one that does not parse', () => {
    expect(href(undefined)).to.equal(null);
    expect(href('')).to.equal(null);
    expect(href(['/home'])).to.equal(null);
    expect(href('https://')).to.equal(null);
  });
});
