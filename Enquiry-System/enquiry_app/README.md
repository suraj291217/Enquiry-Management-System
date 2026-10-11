# EnquiryApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Development server

Start the JSON-backed REST API and Angular app in separate terminals from this
directory. The API persists enquiries in `data/enquiries.json` and listens on
port 3000:

```bash
npm run start:api
```

```bash
npm start
```

Open `http://localhost:4200/`. Angular proxies `/api` requests to the API.
Submitting an enquiry sends `POST /api/enquiries` (HTTP 201); admin status and
trash updates send `PUT /api/enquiries/:id` (HTTP 200); tracking sends
`GET /api/enquiries?code=...&email=...` (HTTP 200 or 404). These requests and
their status codes are visible in the browser's Network panel.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
