# Enquiry Management System

A customer support enquiry portal with a lightweight admin workspace. Customers can submit a request, keep its reference number, and check its progress. Support staff can review enquiries, update their status, and manage the categories and statuses used by the portal.

The application is built with standalone Angular components and Angular Material, with a small Node.js REST API that persists enquiry records to a JSON file for local development.

## Highlights

### Customer portal

- Submit an enquiry through a guided, two-step vertical form.
- Get inline validation and a confirmation with a unique enquiry ID.
- Save an in-progress form draft in the current browser session.
- Look up an enquiry using its ID and the email address used to submit it.
- See request status, category, submission and update dates, and any customer-facing admin response.

### Admin workspace

- Review enquiries in a searchable, filterable, paginated list.
- Filter by status, category, and record view, including trashed enquiries.
- Open an enquiry to review customer details and its message.
- Update an enquiry's status and customer-visible response.
- Move enquiries to trash and restore them when needed.
- Manage enquiry categories and statuses.

### Product experience

- Responsive layouts for desktop and smaller screens.
- Angular Material form fields and stepper, styled to fit the application's visual design.
- Client-side form validation and clear submission/error feedback.

## Technology

- **Frontend:** Angular 22, TypeScript, Angular Material, Angular CDK, RxJS
- **Styling:** CSS and Bootstrap 5
- **Development API:** Node.js built-in HTTP server
- **Enquiry persistence:** JSON file at `Enquiry-System/enquiry_app/data/enquiries.json`
- **Tests:** Angular CLI test runner with Vitest

## Requirements

- Node.js compatible with the installed Angular CLI
- npm

Check your installed versions:

```bash
node --version
npm --version
```

## Run locally

The frontend and API run as separate processes. Open a terminal at the repository root and install the frontend dependencies:

```bash
cd Enquiry-System/enquiry_app
npm ci
```

Start the API in one terminal:

```bash
npm run start:api
```

In a second terminal, start the Angular development server:

```bash
cd Enquiry-System/enquiry_app
npm start
```

Open [http://localhost:4200](http://localhost:4200). The Angular development server proxies `/api` requests to the API on `http://localhost:3000`.

The API port can be changed with the `API_PORT` environment variable. If it is changed, update `Enquiry-System/enquiry_app/proxy.conf.json` to use the same port.

## Admin demo access

For local demonstration only, the current frontend accepts either `admin@gmail.com` or `admin` as the username and `password` as the password.

> **Security note:** This is a client-side demonstration login, not production authentication. Do not expose sensitive information or deploy the application with these credentials as an access-control mechanism.

## API overview

The local API stores enquiries in `data/enquiries.json` relative to the app directory.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/enquiries` | Create an enquiry; returns the created record with HTTP `201`. |
| `GET` | `/api/enquiries?code=ENQ-0001&email=customer@example.com` | Retrieve customer-safe status information when the enquiry ID and email match; returns `404` when no match is found. |
| `PUT` | `/api/enquiries/:id` | Update an enquiry; returns the updated record with HTTP `200`. |

The public tracking response omits private customer contact details and the original message. Admin list and update workflows use the frontend's browser storage together with the API update endpoint.

## Useful commands

Run these from `Enquiry-System/enquiry_app`:

```bash
npm start                    # Start the Angular development server
npm run start:api             # Start the local enquiry API
npm run build                 # Create a production build in dist/
npm test -- --watch=false     # Run the test suite once
npm run watch                 # Rebuild automatically during development
```

## Project layout

```text
Enquiry-Management-System/
├── README.md
└── Enquiry-System/
    ├── ARCHITECTURE.md
    └── enquiry_app/
        ├── server.mjs
        ├── data/
        │   └── enquiries.json
        └── src/
            └── app/
                ├── guards/       # Admin route guard
                ├── model/        # Enquiry, category, status, and user types
                ├── pages/        # Customer portal and admin pages
                ├── services/     # API access, browser state, and shared services
                └── shared/       # Reusable UI components
```

## Data and local development notes

- The Node API persists enquiry records to `Enquiry-System/enquiry_app/data/enquiries.json`.
- Enquiry, category, and status state is also represented in browser `localStorage` for the frontend's admin workflows.
- The unfinished enquiry and tracking forms use `sessionStorage` drafts in the current browser session.
- The JSON file and browser storage are intended for local development and demonstration, not concurrent or production data storage.

## Testing

Run the full frontend test suite:

```bash
cd Enquiry-System/enquiry_app
npm test -- --watch=false
```

Tests cover the customer enquiry flow, enquiry tracking, admin pages, services, and application behavior.
