# PrahEstate Service

A backend service for continuously fetching and managing real estate data from the Sreality API. This service provides REST API endpoints for querying stored estate data and supports automated data synchronization.

## Features

- **Automated Data Fetching**: Continuously syncs real estate data from Sreality API
- **REST API**: Query estates with filtering, pagination, and search capabilities
- **Database Storage**: PostgreSQL with Prisma ORM for data persistence
- **Scheduled Synchronization**: Configurable cron-based data updates
- **Real-time Sync Status**: Monitor sync operations and history
- **Comprehensive Logging**: Track data changes and system operations
- **Health Checks**: Monitor service availability and database connectivity

## Architecture

- **Node.js + TypeScript**: Modern backend development
- **Express.js**: Web framework for REST API
- **Prisma**: Type-safe database ORM and migration tool
- **PostgreSQL**: Robust relational database
- **node-cron**: Scheduled task execution
- **Axios**: HTTP client for API requests

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd prahestate-service
   npm install
   ```

2. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/prahestate"
   PORT=3000
   NODE_ENV=development
   
   # Sreality API Configuration
   SREALITY_API_URL=https://www.sreality.cz/api/en/v2/estates
   API_PER_PAGE=20
   API_MAX_PAGES=100
   API_REQUEST_DELAY_MS=1000
   
   # Sync Configuration
   SYNC_ENABLED=true
   SYNC_SCHEDULE="0 */6 * * *"
   SYNC_BATCH_SIZE=100
   ```

3. **Database Setup:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

4. **Build and Start:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Estates

- **GET `/api/estates`** - List estates with filtering
  - Query params: `category`, `type`, `locality`, `district`, `minPrice`, `maxPrice`, `ownershipType`, `hasBalcony`, `hasTerrace`, `powerEfficiency`, `hasElevator`, `minUsableArea`, `maxUsableArea`, `hasCellar`, `isFurnished`, `page`, `limit`
  - Example: `/api/estates?locality=Prague&district=Praha%201&hasBalcony=true&minUsableArea=50&page=1&limit=20`

- **GET `/api/estates/:id`** - Get estate by internal ID
- **GET `/api/estates/sreality/:srealityId`** - Get estate by Sreality ID

### Statistics

- **GET `/api/stats`** - Get database statistics
  - Returns: total estates, active/inactive counts, last sync time

### Sync Management

- **POST `/api/sync`** - Trigger manual synchronization
- **GET `/api/sync/status`** - Get current sync status
- **GET `/api/sync/history`** - Get sync operation history

### System

- **GET `/health`** - Health check endpoint

## Database Schema

### Estates Table
- `id` - Internal UUID
- `srealityId` - External Sreality ID (unique)
- `name` - Property name/title
- `category` - Property category (1=for sale, 2=for rent)
- `type` - Property type (1=apartment, 2=house, etc.)
- `price` - Property price in CZK
- `priceNote` - Additional price information
- `locality` - Location/neighborhood
- `district` - Prague district (Praha 1, Praha 2, etc.)
- `description` - Property description
- `gps` - GPS coordinates (JSON)
- `images` - Array of image URLs
- `amenities` - Structured amenities data (JSON)
- `meta` - Additional metadata (JSON)
- `srealityUrl` - Link to property on Sreality.cz
- `ownershipType` - Type of ownership (Personal, Cooperative, etc.)
- `hasBalcony` - Whether property has a balcony
- `hasTerrace` - Whether property has a terrace  
- `powerEfficiency` - Energy efficiency rating (A-G)
- `hasElevator` - Whether building has an elevator
- `usableArea` - Usable area in square meters
- `hasCellar` - Whether property includes a cellar
- `isFurnished` - Whether property is furnished
- `firstSeen` - When first discovered
- `lastSeen` - Last time seen in API
- `isActive` - Whether still available

### Sync Logs Table
- Tracks all synchronization operations
- Records success/failure status, item counts, timing

## Development

### Project Structure
```
src/
├── config/           # Configuration management
├── services/         # Business logic services
│   ├── database.ts   # Database operations
│   ├── sreality-api.ts # API client
│   └── sync.ts       # Synchronization logic
├── types/            # TypeScript type definitions  
├── server.ts         # Express server setup
└── index.ts          # Application entry point

prisma/
└── schema.prisma     # Database schema
```

### Key Services

- **DatabaseService**: Handles all database operations
- **SrealityApiClient**: Manages API communication
- **SyncService**: Orchestrates data synchronization
- **ApiServer**: Provides REST API endpoints

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes
npm run db:migrate     # Run migrations
npm run db:studio      # Open Prisma Studio

# View database
npm run db:studio
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `SREALITY_API_URL` | Sreality API base URL | Official API |
| `API_PER_PAGE` | Items per API request | 20 |
| `API_MAX_PAGES` | Maximum pages to fetch | 100 |
| `API_REQUEST_DELAY_MS` | Delay between requests | 1000 |
| `SYNC_ENABLED` | Enable scheduled sync | true |
| `SYNC_SCHEDULE` | Cron schedule | "0 */6 * * *" |
| `SYNC_BATCH_SIZE` | Items per batch | 100 |

### Sync Schedule Examples

- `"0 */6 * * *"` - Every 6 hours
- `"0 0 */12 * * *"` - Every 12 hours  
- `"0 0 2 * * *"` - Daily at 2 AM
- `"0 0 2 * * 1"` - Weekly on Monday at 2 AM

## Deployment

### Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Docker Compose:**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/prahestate
       depends_on:
         - db
     
     db:
       image: postgres:15
       environment:
         POSTGRES_DB: prahestate
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

### Production Considerations

- Use connection pooling for database
- Implement proper logging (Winston, Pino)
- Add monitoring and metrics (Prometheus)
- Configure reverse proxy (Nginx)
- Set up SSL/TLS certificates
- Implement rate limiting
- Add input validation and sanitization
- Configure CORS properly
- Use environment-specific configurations

## Monitoring

### Health Checks
- `GET /health` - Basic service health
- Database connectivity verification
- API endpoint availability

### Logging
- Structured logging with timestamps
- Sync operation tracking
- Error reporting and stack traces
- Performance metrics

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For questions or issues, please open a GitHub issue or contact the development team.
