# @all41-dev/iam

**API for Identity and Access Management (IAM)**

`@all41-dev/iam` provides a modular and extensible backend library to manage users, roles, permissions, scopes, and feature access across applications in the All41 ecosystem.

It offers both **standalone** and **integrated** usage modes, making it suitable for testing, configuration, or embedding into your backend architecture.

---

## Features

* Centralized Identity & Access Management logic
* Singleton-based architecture for configuration and usage
* Supports users, groups, roles, permissions, scopes, and features
* Easily testable with in-memory or local database setups
* Integrates with the [IAM frontend](https://github.com/all41-dev/iam.front.git) and related components

---

## Installation

Install the package via npm:

```bash
npm install @all41-dev/iam
```

---

## Usage

You can use the library in two main ways:

### 1. **Standalone Configuration**

Run the project locally to configure IAM without embedding it in your application:

```bash
npm run build && npm start
```

This launches a local server for managing IAM entities (users, permissions, etc.).
You can also test the main singleton classes in isolation for unit or integration testing.

### 2. **Integrated Configuration**

To embed IAM into your existing backend:

* Import the necessary services and singleton instances from `@all41-dev/iam`
* Follow the setup instructions in the [IAM Frontend Repository](https://github.com/all41-dev/iam.front.git) to connect the frontend UI
* Use the IAM API to define, evaluate, and enforce access control in your application logic

---

## Documentation

Full documentation is available at:

👉 [`@all41-dev/iam.doc`](https://www.npmjs.com/package/@all41-dev/iam.doc)

This includes guides on:

* Scopes and Feature Trees
* Permission Resolution Logic
* Integration with Express or custom frameworks
* Environment configuration
---

## Session routes

Mounted under `/auth` by `@all41-dev/server`. Lifetimes: access token 5 min; refresh token 24 h from sign-in, never extended by a refresh; one-time code 60 s.

| Route | Answer |
|---|---|
| `GET /<provider>?redirectUrl=&redirectDomain=&redirectScheme=` | Starts the OAuth flow. A `redirectDomain` other than the auth host makes the landing external. |
| `GET /<provider>/callback` | Sets `auth`, `refresh` and `provider` cookies and redirects. To an external host the tokens are appended to the URL; with the option `externalLogin: "code"` a one-time code is stored instead, no cookie is set, and the redirect goes to `<scheme>://<domain>/auth/callback?code=`. |
| `POST /exchange` `{ code }` | Server-to-server. `200 { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, provider, redirectPath }`, else `400 { code: "INVALID_CODE" }`. Single use. |
| `POST /refresh` `{ refreshToken }` (or the `refresh` cookie) | Rotates: `200 { user, token, accessToken, accessExpiresAt, refreshToken, refreshExpiresAt }` with both cookies set; `401 { code }` with `REFRESH_INVALID`, `REFRESH_EXPIRED` or `REFRESH_REUSED`. A reused token revokes every token of its user. |
| `POST /logout` | Revokes the presented refresh token, clears the cookies, `204`. |
| `GET /logout` | Same, then redirects to `redirectAfterLogin`. |
| `GET /profile` | The signed-in user. |

`authMiddleware` refreshes the access token from the `refresh` cookie without rotating it, so a WebSocket upgrade keeps a valid refresh token. A refusal is `401 { code }` with `NO_SESSION`, `TOKEN_INVALID` or `TOKEN_EXPIRED`.

The database side is in `src/db/scripts/1.2.0.sql`, additive only: `iam_refresh_token` gains `jti`, `family_uuid`, `family_created_at` and `rotated_at`, all nullable, and the table `iam_auth_code` is created. A refresh token issued before it has no `jti` and is still accepted until it expires. A host that applies its own scripts folder carries the same statements there.
