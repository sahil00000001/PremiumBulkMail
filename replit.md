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
- **Pixel Tracking**: External API integration (https://pixel-tracker-dc1i.onrender.com)
- **Analytics**: Comprehensive email open tracking with view counts and timing

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
- **2025-10-04**: **REPLIT SETUP COMPLETE**: Successfully configured GitHub import for Replit environment
- **2025-10-04**: Fixed server to bind to 0.0.0.0 for development and production compatibility
- **2025-10-04**: Fixed TypeScript error in vite.ts (allowedHosts typing issue)
- **2025-10-04**: Configured workflow for port 5000 with webview output
- **2025-10-04**: Verified application runs correctly with all features working
- **2025-07-27**: **MIGRATION COMPLETE**: Successfully migrated project from Replit Agent to standard Replit environment
- **2025-07-27**: Fixed server binding for production deployment (uses 0.0.0.0 in production, 127.0.0.1 in development)
- **2025-07-27**: Fixed npm dependency conflicts using .npmrc with legacy-peer-deps=true
- **2025-07-27**: Verified all packages install correctly and server runs on port 5000
- **2025-07-27**: **MAJOR**: Integrated external Pixel Tracking API (https://pixel-tracker-dc1i.onrender.com)
- **2025-07-27**: Replaced local tracking with external API for better Gmail compatibility and analytics
- **2025-07-27**: Added new PixelTrackingService with centralized API configuration
- **2025-07-27**: Updated EmailTemplateProcessor to use external pixel creation API
- **2025-07-27**: Added new API endpoints for pixel analytics and batch tracking statistics
- **2025-07-27**: Implemented fallback handling for pixel creation failures
- **2025-07-27**: Added environment configuration for PIXEL_TRACKER_BASE_URL
- **2025-07-27**: Created comprehensive tracking analytics with open rates, view counts, and timing data
- **2025-07-27**: Added beautiful visitor counter with real-time WebSocket updates in footer
- **2025-07-27**: Implemented session tracking, time analytics, and live visitor statistics
- **2025-07-27**: **MAJOR**: Integrated email engagement time tracking for lead scoring
- **2025-07-27**: Added totalViewTime, viewCount, and lastSeenAt fields to email schema
- **2025-07-27**: Created EngagementAnalytics component with sorting/filtering by reading time
- **2025-07-27**: Enhanced tracking service to capture engagement metrics from external API
- **2025-07-27**: Implemented lead scoring based on reading time (30s+ = high interest)
- **2025-07-27**: Added tabbed dashboard with Overview and Engagement Analytics views
- **2025-07-27**: Created time formatting utilities to display engagement time in mm:ss format

## User Preferences
- Standard full-stack JavaScript development patterns
- Client/server separation with secure practices
- Modern React patterns with hooks and functional components

## Development Notes
- Server runs on port 5000 (0.0.0.0:5000)
- Uses `tsx` for TypeScript execution in development
- Configured with proper Vite setup for frontend/backend integration
- All required packages are installed and working