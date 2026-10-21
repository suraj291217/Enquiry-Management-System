import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const enquiriesFile = process.env.ENQUIRIES_FILE ?? fileURLToPath(new URL('./data/enquiries.json', import.meta.url));
const usersFile = process.env.USERS_FILE ?? fileURLToPath(new URL('./data/users.json', import.meta.url));
const port = Number(process.env.API_PORT ?? 3000);
const sessionCookie = 'ems_session';
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@gmail.com').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === 'production' ? '' : 'password');

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
  }
  return JSON.parse(body);
}

function sessionCookieHeader(token, maxAge = sessionLifetime / 1000) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function getSession(request) {
  const cookieHeader = request.headers.cookie ?? '';
  const token = cookieHeader.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  const session = token ? sessions.get(token) : undefined;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function publicUser(user) {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    loginTime: user.loginTime,
  };
}

function openSession(response, user) {
  const token = randomBytes(32).toString('hex');
  const loginTime = new Date().toISOString();
  sessions.set(token, {
    user: { ...user, loginTime },
    expiresAt: Date.now() + sessionLifetime,
  });
  response.setHeader('Set-Cookie', sessionCookieHeader(token));
  return publicUser({ ...user, loginTime });
}

function hasRole(session, role) {
  return session?.user.role === role;
}

function validEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone) {
  return typeof phone === 'string'
    && phone.length <= 32
    && /^\+?[0-9().\s-]{7,32}$/.test(phone)
    && phone.replace(/\D/g, '').length >= 7
    && phone.replace(/\D/g, '').length <= 15;
}

async function handleAuth(request, response, url) {
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const input = await readRequestBody(request);
    const name = typeof input?.name === 'string' ? input.name.trim() : '';
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
    const password = input?.password;
    if (!name || name.length > 100 || !validEmail(email) || !validPhone(phone)
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      await sendJson(response, 400, { message: 'Enter a valid name, email, phone number, and a password of at least 8 characters.' });
      return true;
    }

    const users = await readJson(usersFile);
    if (users.some(user => user.email.toLowerCase() === email)) {
      await sendJson(response, 409, { message: 'An account with this email already exists. Sign in instead.' });
      return true;
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(password, salt, 64).toString('hex');
    const user = {
      userId: users.reduce((maxId, item) => Math.max(maxId, item.userId), 0) + 1,
      name,
      email,
      phone,
      role: 'user',
      salt,
      passwordHash,
    };
    users.push(user);
    await writeFile(usersFile, `${JSON.stringify(users, null, 2)}\n`);
    await sendJson(response, 201, {
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    return true;
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const input = await readRequestBody(request);
    const email = typeof input?.email === 'string' ? input.email.trim() : '';
    const password = input?.password;
    if (typeof password !== 'string' || !password || password.length > 128) {
      await sendJson(response, 400, { message: 'Enter your email and password.' });
      return true;
    }

    let user;
    const isAdminEmail = email.toLowerCase() === adminEmail
      || (process.env.NODE_ENV !== 'production' && email.toLowerCase() === 'admin');
    if (adminPassword && isAdminEmail && password === adminPassword) {
      user = { userId: 1, email, name: 'Admin', phone: '', role: 'admin' };
    } else if (validEmail(email)) {
      const users = await readJson(usersFile);
      const candidate = users.find(item => item.email.toLowerCase() === email.toLowerCase());
      if (candidate) {
        const actual = scryptSync(password, candidate.salt, 64);
        const expected = Buffer.from(candidate.passwordHash, 'hex');
        if (actual.length === expected.length && timingSafeEqual(actual, expected)) user = candidate;
      }
    }

    if (!user) {
      await sendJson(response, 401, { message: 'Invalid email or password.' });
      return true;
    }
    await sendJson(response, 200, openSession(response, user));
    return true;
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const session = getSession(request);
    if (!session) {
      await sendJson(response, 401, { message: 'Sign in to continue.' });
      return true;
    }
    await sendJson(response, 200, publicUser(session.user));
    return true;
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const session = getSession(request);
    if (session) sessions.delete(session.token);
    await sendJson(response, 200, { success: true }, {
      'Set-Cookie': sessionCookieHeader('', 0),
    });
    return true;
  }

  if (url.pathname.startsWith('/api/auth/')) {
    response.setHeader('Allow', 'GET, POST');
    await sendJson(response, 405, { message: 'Method not allowed.' });
    return true;
  }
  return false;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const updateMatch = /^\/api\/enquiries\/(\d+)$/.exec(url.pathname);

  try {
    if (await handleAuth(request, response, url)) return;
    if (url.pathname !== '/api/enquiries' && !updateMatch) {
      await sendJson(response, 404, { message: 'API endpoint not found.' });
      return;
    }

    const session = getSession(request);
    const isCreate = request.method === 'POST' && url.pathname === '/api/enquiries';
    const isUpdate = request.method === 'PUT' && updateMatch !== null;
    if (isCreate || isUpdate) {
      if (isUpdate && !hasRole(session, 'admin')) {
        await sendJson(response, 403, { message: 'Admin access is required to update enquiries.' });
        return;
      }
      if (isCreate && !hasRole(session, 'user')) {
        await sendJson(response, session ? 403 : 401, {
          message: session ? 'Customer access is required to submit an enquiry.' : 'Sign in before submitting an enquiry.',
        });
        return;
      }

      const input = await readRequestBody(request);
      const requiredFields = [
        'customerName', 'customerEmail', 'customerPhone', 'categoryId',
        'statusId', 'enquiryType', 'enquiryDetails',
      ];
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || requiredFields.some(field => input[field] === undefined || input[field] === '')
        || ['customerName', 'customerEmail', 'customerPhone', 'enquiryType', 'enquiryDetails']
          .some(field => typeof input[field] !== 'string' || !input[field].trim())
        || !Number.isSafeInteger(input.categoryId) || !Number.isSafeInteger(input.statusId)) {
        await sendJson(response, 400, { message: 'All enquiry fields are required.' });
        return;
      }

      if (isCreate && session.user.role === 'user'
        && input.customerEmail.trim().toLowerCase() !== session.user.email.toLowerCase()) {
        await sendJson(response, 403, { message: 'An enquiry must use the email address on your account.' });
        return;
      }

      const enquiries = await readJson(enquiriesFile);
      const enquiryId = isUpdate
        ? Number(updateMatch[1])
        : enquiries.reduce((maxId, enquiry) => Math.max(maxId, enquiry.enquiryId), 0) + 1;
      if (!Number.isSafeInteger(enquiryId) || enquiryId < 1) {
        await sendJson(response, 400, { message: 'Enquiry ID must be a positive integer.' });
        return;
      }
      const existingIndex = enquiries.findIndex(enquiry => enquiry.enquiryId === enquiryId);
      const enquiry = {
        ...input,
        ...(isCreate && session.user.role === 'user' ? { customerEmail: session.user.email } : {}),
        enquiryId,
        createdDate: enquiries[existingIndex]?.createdDate ?? input.createdDate ?? new Date().toISOString(),
        updatedDate: isUpdate ? new Date().toISOString() : input.updatedDate,
      };
      if (existingIndex === -1) {
        enquiries.push(enquiry);
      } else {
        enquiries[existingIndex] = enquiry;
      }
      await writeFile(enquiriesFile, `${JSON.stringify(enquiries, null, 2)}\n`);
      await sendJson(response, isUpdate ? 200 : 201, enquiry);
      return;
    }

    if (request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (code !== null) {
        if (!hasRole(session, 'user')) {
          await sendJson(response, session ? 403 : 401, {
            message: session ? 'Customer access is required to track an enquiry.' : 'Sign in before tracking an enquiry.',
          });
          return;
        }
        const codeMatch = /^ENQ-(\d{4,})$/i.exec(code);
        const enquiries = await readJson(enquiriesFile);
        const enquiry = codeMatch
          ? enquiries.find(item => item.enquiryId === Number(codeMatch[1])
            && !item.isDeleted
            && item.customerEmail.trim().toLowerCase() === session.user.email.toLowerCase())
          : undefined;
        if (!enquiry) {
          await sendJson(response, 404, {
            message: 'We could not find a matching enquiry in your account. Check the ID and try again.',
          });
          return;
        }
        const { enquiryId, categoryId, statusId, enquiryType, createdDate, updatedDate, resolutionNotes } = enquiry;
        await sendJson(response, 200, {
          enquiryId, categoryId, statusId, enquiryType, createdDate, updatedDate, resolutionNotes,
        });
        return;
      }

      if (!hasRole(session, 'admin')) {
        await sendJson(response, session ? 403 : 401, { message: 'Admin access is required to view all enquiries.' });
        return;
      }
      await sendJson(response, 200, await readJson(enquiriesFile));
      return;
    }

    response.setHeader('Allow', 'GET, POST, PUT');
    await sendJson(response, 405, { message: 'Method not allowed.' });
  } catch (error) {
    const status = Number.isInteger(error.status)
      ? error.status
      : error instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error('Enquiry API request failed:', error);
    await sendJson(response, status, {
      message: status === 400 ? 'Request body must be valid JSON.' : error.message,
    });
  }
});

server.listen(port, () => {
  console.log(`Enquiry API listening on http://localhost:${port}`);
});
