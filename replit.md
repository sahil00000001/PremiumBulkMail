# Mass Marketing Tool

## Overview
A full-stack JavaScript application for bulk email marketing using Node.js, Express, React, and Vite. The application provides functionality for uploading Excel files with contact data and sending bulk emails using NodeMailer and SendGrid integration.

## Project Architecture
- **Frontend**: React with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js server with TypeScript
- **Database**: Configured for PostgreSQL with Drizzle ORM
- **Email Services**: NodeMailer and SendGrid integration
- **File Processing**: Excel file upload and processing with ExcelJS
- **Authentication**: Passport.js with local strategy
- **Session Management**: Express sessions with connect-pg-simple

## Technical Stack
- **Runtime**: Node.js 20 with TypeScript
- **Frontend Framework**: React 18 with Vite
- **Backend Framework**: Express.js
- **Styling**: Tailwind CSS v3.4 with shadcn/ui components
- **Database ORM**: Drizzle ORM with PostgreSQL support
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: TanStack Query v5
- **Routing**: Wouter for client-side routing

## Recent Changes
- **2025-01-24**: Migrated project from Replit Agent to standard Replit environment
- **2025-01-24**: Verified all dependencies are properly installed and working
- **2025-01-24**: Confirmed server starts successfully on port 5000
- **2025-01-24**: Fixed ExcelUpload component error by adding missing columns and emailColumn props from useEmail hook
- **2025-01-24**: Enhanced email tracking system with pixel tracking and dashboard
- **2025-01-24**: Added comprehensive tracking dashboard showing open rates and detailed analytics
- **2025-01-24**: Updated StatusBox component to show different states (pending, sent, opened, failed)
- **2025-01-24**: Added new step 5 for tracking dashboard with real-time updates

## User Preferences
- Standard full-stack JavaScript development patterns
- Client/server separation with secure practices
- Modern React patterns with hooks and functional components

## Development Notes
- Server runs on port 5000 (0.0.0.0:5000)
- Uses `tsx` for TypeScript execution in development
- Configured with proper Vite setup for frontend/backend integration
- All required packages are installed and working