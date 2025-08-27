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