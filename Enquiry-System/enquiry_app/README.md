# EnquiryApp

## Development server

Start the JSON-backed REST API and Angular app in separate terminals from this
directory. The API persists enquiries in `data/enquiries.json`, customer
accounts in `data/users.json`, and listens on port 3000:

```bash
npm run start:api
```

```bash
npm start
```

Open `http://localhost:4200/`. Angular proxies `/api` requests to the API.
Customers can create an account at `/customer/register`, then sign in at
`/customer/login` to submit enquiries and track them by enquiry ID. Admins use
`/admin/login`. The API uses an HTTP-only session cookie, hashes customer
passwords with scrypt, and checks roles for enquiry creation, tracking, and
administration. Customer enquiry lookups are restricted to the signed-in
account. The development admin credentials remain `admin@gmail.com` (or
`admin`) with password `password`. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in
the API environment before deployment; production mode disables the default
admin password and the `admin` username alias.

The API exposes `POST /api/auth/register`, `POST /api/auth/login`,
`GET /api/auth/me`, and `POST /api/auth/logout`. Customer submissions send
`POST /api/enquiries`; admin enquiry lists use `GET /api/enquiries`, admin
status and trash updates use `PUT /api/enquiries/:id`, and customers track a
request using `GET /api/enquiries?code=ENQ-0001`. These requests and their
status codes are visible in the browser's Network panel.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Tests

Run the Angular unit tests:

```bash
npm test -- --watch=false
```

Run the API integration tests:

```bash
npm run test:api
```
