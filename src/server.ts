import express, { Express, Request, Response, NextFunction, Handler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseService } from './services/database';
import { SyncService } from './services/sync';
import config from './config';

// Helper function to convert BigInt values to strings for JSON serialization
const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
};

interface QueryFilters {
  category?: number;
  type?: number;
  locality?: string;
  district?: string;
  minPrice?: bigint;
  maxPrice?: bigint;
  ownershipType?: string;
  hasBalcony?: boolean;
  hasTerrace?: boolean;
  powerEfficiency?: string;
  hasElevator?: boolean;
  minUsableArea?: number;
  maxUsableArea?: number;
  hasCellar?: boolean;
  isFurnished?: boolean;
  page?: number;
  limit?: number;
}

// Wrapper for async route handlers to catch errors and pass them to the error handler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): Handler => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export class ApiServer {
  private app: Express;
  private dbService: DatabaseService;
  private syncService: SyncService;

  constructor() {
    this.app = express();
    this.dbService = new DatabaseService();
    this.syncService = new SyncService();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(morgan('combined'));
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'prahestate-service',
        version: '1.0.0',
      });
    });

    // API Health check (alias)
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'prahestate-service',
        version: '1.0.0',
      });
    });

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'PrahEstate Service',
        version: '1.0.0',
        description: 'Real estate data service for Prague properties',
        endpoints: {
          health: '/health or /api/health',
          estates: '/api/estates',
          sync: '/api/sync',
          stats: '/api/stats',
        },
      });
    });

    // --- API Routes ---

    // Estates
    this.app.get('/api/estates', asyncHandler(async (req, res, next) => {
      const filters: QueryFilters = {
        category: req.query.category ? parseInt(req.query.category as string) : undefined,
        type: req.query.type ? parseInt(req.query.type as string) : undefined,
        locality: req.query.locality as string,
        district: req.query.district as string,
        minPrice: req.query.minPrice ? BigInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? BigInt(req.query.maxPrice as string) : undefined,
        ownershipType: req.query.ownershipType as string,
        hasBalcony: req.query.hasBalcony ? req.query.hasBalcony === 'true' : undefined,
        hasTerrace: req.query.hasTerrace ? req.query.hasTerrace === 'true' : undefined,
        powerEfficiency: req.query.powerEfficiency as string,
        hasElevator: req.query.hasElevator ? req.query.hasElevator === 'true' : undefined,
        minUsableArea: req.query.minUsableArea ? parseFloat(req.query.minUsableArea as string) : undefined,
        maxUsableArea: req.query.maxUsableArea ? parseFloat(req.query.maxUsableArea as string) : undefined,
        hasCellar: req.query.hasCellar ? req.query.hasCellar === 'true' : undefined,
        isFurnished: req.query.isFurnished ? req.query.isFurnished === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      };
      const result = await this.dbService.getEstates(filters);
      res.json({
        success: true,
        data: serializeBigInt(result.estates),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20)),
        },
      });
    }));

    this.app.get('/api/estates/sreality/:srealityId', asyncHandler(async (req, res, next) => {
      const { srealityId } = req.params;
      if (!srealityId) {
        res.status(400).json({ success: false, error: 'Sreality ID is required' });
        return;
      }
      const srealityIdBigInt = BigInt(srealityId);
      const estate = await this.dbService.getEstateBySrealityId(srealityIdBigInt);
      if (estate) {
        res.json({ success: true, data: serializeBigInt(estate) });
      } else {
        res.status(404).json({ success: false, error: 'Estate not found' });
      }
    }));

    this.app.get('/api/estates/slug/:slug', asyncHandler(async (req, res, next) => {
      const { slug } = req.params;
      if (!slug) {
        res.status(400).json({ success: false, error: 'Slug is required' });
        return;
      }
      const estate = await this.dbService.getEstateBySlug(slug);
      if (estate) {
        res.json({ success: true, data: serializeBigInt(estate) });
      } else {
        res.status(404).json({ success: false, error: 'Estate not found' });
      }
    }));

    this.app.get('/api/estates/:id', asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID is required' });
        return;
      }
      const estate = await this.dbService.getEstateById(id);
      if (estate) {
        res.json({ success: true, data: serializeBigInt(estate) });
      } else {
        res.status(404).json({ success: false, error: 'Estate not found' });
      }
    }));

    // Sync
    this.app.post('/api/sync', (req: Request, res: Response, next: NextFunction) => {
      try {
        if (this.syncService.isCurrentlyRunning()) {
          res.status(409).json({ success: false, error: 'Sync is already running' });
          return;
        }
        this.syncService.triggerManualSync().catch(console.error); // Fire and forget
        res.status(202).json({ success: true, message: 'Sync started' });
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/api/sync/status', asyncHandler(async (req, res, next) => {
      const isRunning = this.syncService.isCurrentlyRunning();
      const lastSync = await this.syncService.getLastSyncStatus();
      res.json({ success: true, data: { isRunning, lastSync } });
    }));

    this.app.get('/api/sync/history', asyncHandler(async (req, res, next) => {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const history = await this.syncService.getSyncHistory(limit);
      res.json({ success: true, data: history });
    }));

    this.app.get('/api/sync/logs', asyncHandler(async (req, res, next) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await this.dbService.getSyncLogs(page, limit);
      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    }));

    // Stats
    this.app.get('/api/stats/summary', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getSummaryStats();
      res.json({ success: true, data: stats });
    }));
    
    this.app.get('/api/stats/districts', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getDistrictStats();
      res.json({ success: true, data: stats });
    }));

    this.app.get('/api/stats/localities', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getLocalityStats();
      res.json({ success: true, data: stats });
    }));

    this.app.get('/api/stats/ownership-types', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getOwnershipTypeStats();
      res.json({ success: true, data: stats });
    }));

    this.app.get('/api/stats/price-distribution', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getPriceDistribution();
      res.json({ success: true, data: stats });
    }));

    this.app.get('/api/stats/area-distribution', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getAreaDistribution();
      res.json({ success: true, data: stats });
    }));

    this.app.get('/api/stats', asyncHandler(async (req, res, next) => {
      const stats = await this.dbService.getStats();
      res.json({ success: true, data: stats });
    }));

    // Sreality Proxy
    this.app.get('/api/sreality/proxy', asyncHandler(async (req, res, next) => {
      const response = await this.syncService.proxySrealityApi(req.query);
      res.json({ success: true, data: response });
    }));

    // --- Error Handling ---
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      if (res.headersSent) {
        return next(error);
      }
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize services
      await this.dbService.connect();
      await this.syncService.initialize();

      // Start server
      this.app.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
        console.log(`Environment: ${config.env}`);
        console.log(`Sync enabled: ${config.sync.enabled}`);
        
        // Trigger initial sync if enabled
        if (config.sync.enabled) {
          console.log('🔄 Starting initial data sync...');
          this.syncService.triggerManualSync()
            .then(() => console.log('✅ Initial sync completed successfully'))
            .catch((error) => console.error('❌ Initial sync failed:', error));
        }
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down server...');
    await this.syncService.shutdown();
    await this.dbService.disconnect();
  }
}

export default ApiServer;
