import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dataFile = fileURLToPath(new URL('./data/enquiries.json', import.meta.url));
const port = Number(process.env.API_PORT ?? 3000);

async function readEnquiries() {
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

async function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const updateMatch = /^\/api\/enquiries\/(\d+)$/.exec(url.pathname);

  try {
    if (url.pathname !== '/api/enquiries' && !updateMatch) {
      await sendJson(response, 404, { message: 'API endpoint not found.' });
      return;
    }

    const isCreate = request.method === 'POST' && url.pathname === '/api/enquiries';
    const isUpdate = request.method === 'PUT' && updateMatch !== null;
    if (isCreate || isUpdate) {
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

      const enquiries = await readEnquiries();
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
        enquiryId,
        createdDate: enquiries[existingIndex]?.createdDate ?? input.createdDate ?? new Date().toISOString(),
        updatedDate: isUpdate ? new Date().toISOString() : input.updatedDate,
      };
      if (existingIndex === -1) {
        enquiries.push(enquiry);
      } else {
        enquiries[existingIndex] = enquiry;
      }
      await writeFile(dataFile, `${JSON.stringify(enquiries, null, 2)}\n`);
      await sendJson(response, isUpdate ? 200 : 201, enquiry);
      return;
    }

    if (request.method === 'GET') {
      const codeMatch = /^ENQ-(\d{4,})$/i.exec(url.searchParams.get('code') ?? '');
      const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
      const enquiries = await readEnquiries();
      const enquiry = codeMatch
        ? enquiries.find(item => item.enquiryId === Number(codeMatch[1])
          && !item.isDeleted
          && item.customerEmail.trim().toLowerCase() === email)
        : undefined;

      if (!enquiry) {
        await sendJson(response, 404, {
          message: 'We could not find a matching enquiry. Check your ID and email and try again.',
        });
        return;
      }

      const { enquiryId, categoryId, statusId, enquiryType, createdDate, updatedDate, resolutionNotes } = enquiry;
      await sendJson(response, 200, {
        enquiryId, categoryId, statusId, enquiryType, createdDate, updatedDate, resolutionNotes,
      });
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
