# ClubOS

ClubOS is a web application designed for comprehensive club management, supporting both admin and member user roles.

## Current Stack
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide React
- AWS Amplify (planned)
- Amazon Cognito (planned)
- Amazon DynamoDB (planned)

## Current Status
This repository currently contains the initial frontend setup. Basic routing and placeholder pages are configured. AWS services and backend integrations have not been integrated yet.

## Planned Features
- Authentication
- User dashboard
- Admin dashboard
- Member management
- Forms
- Events
- Event registration
- Organizing committee applications
- Announcements

## Running Locally

Navigate to the `frontend` directory and run:

```bash
npm install
npm run dev
```

## Project Structure

The frontend source code is organized as follows in `frontend/src/`:

- `components/`: Reusable UI elements and layout wrappers
  - `ui/`: Basic UI components
  - `layout/`: Shared layout components like Header
- `pages/`: Page components for routing
  - `auth/`: Authentication pages (e.g., Login)
  - `user/`: User dashboard pages
  - `admin/`: Admin dashboard pages
- `services/`: API and integration services
- `hooks/`: Custom React hooks
- `types/`: TypeScript type definitions
- `lib/`: Helper utilities and configuration
- `App.tsx`: React Router configuration
- `main.tsx`: Application entry point
- `index.css`: Global styles and Tailwind CSS setup
