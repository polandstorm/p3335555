# Instituto Melo - Post-Sales and Patient Follow-up System

## Overview

Instituto Melo is a comprehensive web-based patient management system designed for healthcare post-sales and follow-up operations. The system manages patient data, procedures, appointments, and collaborative workflows across multiple cities. Built with React + Express + PostgreSQL, it provides role-based access control for administrators and collaborators, enabling efficient patient tracking, procedure management, and automated follow-up scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

### Latest Requirements (January 2025)
- Administrator dashboard must show complete oversight of all collaborator activities
- Clear visibility of collaborator performance and workload management
- Global company statistics with time-based progress tracking (monthly, weekly, custom periods)
- Identification of stalled patients and progress bottlenecks
- Pending task tracking per collaborator for accountability
- Administrator ability to assign specific tasks to collaborator agendas
- Task completion monitoring and verification system

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives for accessible, consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming and component variants
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas for type-safe forms

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with secure cookie configuration
- **Authentication**: Bcrypt for password hashing with role-based access control (admin/collaborator)
- **API Design**: RESTful endpoints with comprehensive error handling and request logging middleware

### Database Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: Comprehensive relational schema with users, collaborators, patients, procedures, events, cities, and activity logging

### Core Data Models
- **Users**: Authentication and role management (admin/collaborator)
- **Collaborators**: Staff management with city assignments and performance goals
- **Patients**: Complete patient profiles with classification system (bronze/silver/gold/diamond)
- **Procedures**: Medical procedures with pricing, validity dates, and follow-up events
- **Events**: Scheduled appointments and follow-ups with status tracking
- **Cities**: Geographic organization for patient and collaborator management

### Authentication & Authorization
- **Session-based**: Express sessions with secure HTTP-only cookies
- **Role-based Access**: Admin and collaborator roles with different permission levels
- **Protected Routes**: Client-side route protection with authentication state management
- **Password Security**: Bcrypt hashing with configurable salt rounds

### Key Business Logic
- **Patient Classification**: Four-tier system (bronze, silver, gold, diamond) for patient categorization
- **Procedure Tracking**: Automatic validity monitoring with overdue notifications
- **Follow-up Management**: Event-based system for scheduled patient communication
- **Goal Tracking**: Revenue and consultation targets for collaborators
- **Registration Workflow**: Two-phase patient registration (admin creation + collaborator completion)
- **Administrative Oversight**: Complete monitoring of collaborator activities and performance
- **Task Management**: Administrator-assigned tasks with completion tracking
- **Performance Analytics**: Time-based progress tracking and bottleneck identification

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Drizzle ORM**: Type-safe database operations and schema management

### UI/UX Libraries
- **Radix UI**: Headless UI components for accessibility and customization
- **Lucide React**: Consistent icon library for UI elements
- **TailwindCSS**: Utility-first CSS framework with custom design system

### Development Tools
- **Vite**: Fast development server and build tool with HMR
- **TypeScript**: Type safety across frontend and backend
- **Replit Integration**: Development environment optimization with error overlay and cartographer

### Validation & Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Performant form handling with validation integration

### Date/Time Management
- **date-fns**: Modern date manipulation library with Portuguese locale support