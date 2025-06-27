# GitHub Copilot Instructions for PrahEstate Service

## Project Overview
This is a Node.js + TypeScript backend service that fetches real estate data from the Sreality API and provides REST endpoints for querying the data. The service uses Express.js, Prisma ORM with PostgreSQL, and implements scheduled data synchronization.

## Architecture & Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Web Framework**: Express.js with CORS, Helmet, Morgan middleware
- **Database**: PostgreSQL with Prisma ORM
- **Scheduling**: node-cron for automated tasks
- **HTTP Client**: Axios for API requests
- **Development**: ts-node, nodemon for hot reload

## Code Style & Patterns

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define interfaces in `src/types/index.ts`
- Use explicit return types for functions
- Prefer `async/await` over Promises
- Use proper error handling with try-catch blocks

### Project Structure
```
src/
├── config/index.ts       # Environment configuration
├── services/            # Business logic services
├── types/index.ts       # TypeScript interfaces
├── server.ts           # Express server setup
└── index.ts            # Application entry point
```

### Database Patterns
- Use Prisma for all database operations
- Define schema in `prisma/schema.prisma`
- Use transactions for related operations
- Implement proper indexing for queries
- Use BigInt for price fields

### API Patterns
- RESTful endpoints with proper HTTP status codes
- JSON responses with consistent structure:
  ```typescript
  {
    success: boolean;
    data?: any;
    error?: string;
    pagination?: PaginationMeta;
  }
  ```
- Implement proper error handling middleware
- Use query parameters for filtering and pagination
- Validate input parameters

### Service Layer Patterns
- Separate concerns: API client, database operations, sync logic
- Use dependency injection patterns
- Implement proper logging for all operations
- Handle rate limiting for external API calls
- Use batch processing for large datasets

## Key Services

### DatabaseService
- Handles all database CRUD operations
- Implements upsert patterns for estate data
- Manages sync logging and history
- Provides filtering and pagination

### SrealityApiClient
- Manages communication with Sreality API
- Implements rate limiting and retry logic
- Transforms API responses to internal format
- Handles pagination and batch fetching

### SyncService
- Orchestrates data synchronization
- Implements scheduled and manual sync
- Tracks sync progress and errors
- Manages estate lifecycle (active/inactive)

## Development Guidelines

### When Adding New Features
1. Define TypeScript interfaces first
2. Add database schema changes via Prisma
3. Implement service layer logic
4. Add API endpoints with proper validation
5. Update tests and documentation

### When Working with Database
- Always use Prisma for database operations
- Run `npm run db:generate` after schema changes
- Use `npm run db:push` for development
- Use migrations for production deployments

### When Adding API Endpoints
- Follow RESTful conventions
- Implement proper error handling
- Add input validation
- Include pagination for list endpoints
- Document response formats

### Environment Variables
- Add new variables to `.env.example`
- Update `src/config/index.ts` for type safety
- Document in README.md
- Use sensible defaults where possible

## Common Tasks

### Database Operations
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:migrate     # Create and run migrations
npm run db:studio      # Open Prisma Studio
```

### Development
```bash
npm run dev           # Start development server
npm run build         # Build TypeScript
npm start            # Start production server
```

### Adding New Estate Fields
1. Update `prisma/schema.prisma`
2. Update `src/types/index.ts` interfaces
3. Update `SrealityApiClient.transformEstate()`
4. Update `DatabaseService.upsertEstate()`
5. Run `npm run db:generate`

### Adding New API Endpoints
1. Add route in `src/server.ts`
2. Implement service method if needed
3. Add proper TypeScript types
4. Test with proper error handling

## Best Practices

### Error Handling
- Always wrap async operations in try-catch
- Log errors with context information
- Return appropriate HTTP status codes
- Don't expose internal errors to clients

### Performance
- Use database indexes for frequently queried fields
- Implement pagination for large datasets
- Use batch operations for bulk data processing
- Add request caching where appropriate

### Security
- Validate all input parameters
- Use Helmet for security headers
- Implement rate limiting
- Don't log sensitive information

### Testing
- Write unit tests for service methods
- Test API endpoints with various scenarios
- Test error conditions and edge cases
- Use TypeScript for test files

## Debugging Tips
- Use `npm run db:studio` to inspect database
- Check sync logs in database for operation history
- Monitor API rate limits and response times
- Use structured logging for better debugging

## Integration Points
- **Sreality API**: External data source with rate limits
- **PostgreSQL**: Primary data storage
- **Cron Jobs**: Scheduled synchronization
- **Express Routes**: REST API endpoints

When working on this project, always consider the data flow: Sreality API → SyncService → DatabaseService → API Endpoints → Clients.
