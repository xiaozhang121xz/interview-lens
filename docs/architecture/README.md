# Architecture

Interview Lens is moving from a Next.js full-stack application to a workspace with an explicit web/API boundary.

## Target layout

- `apps/web`: browser UI and Next.js routes. During migration, the existing root Next.js application is the web app.
- `apps/api`: standalone backend HTTP process. New backend modules are added here.
- `packages/contracts`: runtime Zod schemas and transport types shared by web and API.
- `packages/database`: the only Prisma client entry point.

## Dependency direction

```text
web -> contracts
api -> contracts + database
database -> Prisma
```

Browser code must never import `@interview-lens/database`. API route adapters must become thin and delegate to application services. Existing root imports are kept as compatibility shims and removed module by module.

## Migration rule

Each module is migrated independently. Its old route stays in place until compatibility tests pass, then the old implementation is deleted. A pull request must keep security scanning, type checking, unit tests, and the production build green.
