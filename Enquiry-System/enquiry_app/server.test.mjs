import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
let apiProcess;
let apiUrl;
let testDirectory;

async function reservePort() {
  const reservation = createNetServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const { port } = reservation.address();
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  return port;
}

async function send(pathname, { method = 'GET', body, cookie } = {}) {
  return fetch(`${apiUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function sessionCookie(response) {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'Expected the API to set a session cookie');
  return cookie.split(';', 1)[0];
}

before(async () => {
  testDirectory = await mkdtemp(path.join(os.tmpdir(), 'enquiry-auth-test-'));
  const enquiriesFile = path.join(testDirectory, 'enquiries.json');
  const usersFile = path.join(testDirectory, 'users.json');
  await Promise.all([
    writeFile(enquiriesFile, '[]\n'),
    writeFile(usersFile, '[]\n'),
  ]);
  const port = await reservePort();
  apiUrl = `http://127.0.0.1:${port}`;
  apiProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: appDirectory,
    env: {
      ...process.env,
      API_PORT: String(port),
      ENQUIRIES_FILE: enquiriesFile,
      USERS_FILE: usersFile,
      ADMIN_EMAIL: 'admin@gmail.com',
      ADMIN_PASSWORD: 'password',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  let serverError = '';
  apiProcess.stderr.setEncoding('utf8');
  apiProcess.stderr.on('data', chunk => serverError += chunk);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (apiProcess.exitCode !== null) throw new Error(`API failed to start: ${serverError}`);
    try {
      const response = await send('/api/auth/me');
      if (response.status === 401) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error(`API did not become ready: ${serverError}`);
});

after(async () => {
  if (apiProcess && apiProcess.exitCode === null) {
    const exited = once(apiProcess, 'exit');
    apiProcess.kill();
    await exited;
  }
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
});

test('enforces customer and admin roles across registration, submission, tracking, and administration', async () => {
  const anonymousCreate = await send('/api/enquiries', {
    method: 'POST',
    body: { customerName: 'Avery Chen' },
  });
  assert.equal(anonymousCreate.status, 401);
  assert.equal((await send('/api/enquiries')).status, 401);
  assert.equal((await send('/api/enquiries?code=ENQ-0001')).status, 401);

  const firstRegistration = await send('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      password: 'secure-pass-123',
    },
  });
  assert.equal(firstRegistration.status, 201);
  assert.equal(firstRegistration.headers.get('set-cookie'), null);
  assert.equal((await send('/api/auth/me')).status, 401);
  assert.deepEqual(await firstRegistration.json().then(({ role, email }) => ({ role, email })), {
    role: 'user',
    email: 'avery@example.com',
  });

  const savedUsers = JSON.parse(await readFile(path.join(testDirectory, 'users.json'), 'utf8'));
  assert.notEqual(savedUsers[0].passwordHash, 'secure-pass-123');
  assert.ok(savedUsers[0].salt);

  assert.equal((await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'avery@example.com', password: 'incorrect-password' },
  })).status, 401);
  const customerLogin = await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'avery@example.com', password: 'secure-pass-123' },
  });
  assert.equal(customerLogin.status, 200);
  const firstCustomerLogin = sessionCookie(customerLogin);

  const created = await send('/api/enquiries', {
    method: 'POST',
    cookie: firstCustomerLogin,
    body: {
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Question about an order',
    },
  });
  assert.equal(created.status, 201);
  const enquiry = await created.json();
  const code = `ENQ-${String(enquiry.enquiryId).padStart(4, '0')}`;

  assert.equal((await send(`/api/enquiries?code=${code}`, { cookie: firstCustomerLogin })).status, 200);
  assert.equal((await send('/api/enquiries', { cookie: firstCustomerLogin })).status, 403);
  assert.equal((await send(`/api/enquiries/${enquiry.enquiryId}`, {
    method: 'PUT',
    cookie: firstCustomerLogin,
    body: enquiry,
  })).status, 403);

  const secondRegistration = await send('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Morgan Lee',
      email: 'morgan@example.com',
      phone: '5550101',
      password: 'another-pass-123',
    },
  });
  assert.equal(secondRegistration.status, 201);
  const secondCustomerLogin = await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'morgan@example.com', password: 'another-pass-123' },
  });
  assert.equal(secondCustomerLogin.status, 200);
  const secondCustomerSession = sessionCookie(secondCustomerLogin);
  assert.equal((await send(`/api/enquiries?code=${code}&email=avery@example.com`, { cookie: secondCustomerSession })).status, 404);
  assert.equal((await send('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      password: 'secure-pass-123',
    },
  })).status, 409);

  const logout = await send('/api/auth/logout', { method: 'POST', cookie: secondCustomerSession });
  assert.equal(logout.status, 200);
  assert.equal((await send('/api/auth/me', { cookie: secondCustomerSession })).status, 401);

  const adminLogin = await send('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@gmail.com', password: 'password' },
  });
  assert.equal(adminLogin.status, 200);
  const admin = sessionCookie(adminLogin);
  assert.equal((await send('/api/enquiries', {
    method: 'POST',
    cookie: admin,
    body: {
      customerName: 'Admin',
      customerEmail: 'admin@gmail.com',
      customerPhone: '5550102',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Admin should not submit a customer enquiry',
    },
  })).status, 403);
  const allEnquiries = await send('/api/enquiries', { cookie: admin });
  assert.equal(allEnquiries.status, 200);
  assert.equal((await allEnquiries.json()).length, 1);
  assert.equal((await send(`/api/enquiries/${enquiry.enquiryId}`, {
    method: 'PUT',
    cookie: admin,
    body: { ...enquiry, statusId: 2 },
  })).status, 200);
});
