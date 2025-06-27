import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseService } from './services/database';
import { SyncService } from './services/sync';
import config from './config';

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

    // Get estates with filtering
    this.app.get('/api/estates', async (req: Request, res: Response) => {
      try {
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
          limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // Max 100 per page
        };

        const result = await this.dbService.getEstates(filters);

        res.json({
          success: true,
          data: result.estates,
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: result.total,
            totalPages: Math.ceil(result.total / (filters.limit || 20)),
          },
        });
      } catch (error) {
        console.error('Error fetching estates:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch estates',
        });
      }
    });    // Get estate by ID
    this.app.get('/api/estates/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        if (!id) {
          res.status(400).json({
            success: false,
            error: 'Estate ID is required',
          });
          return;
        }

        const estate = await this.dbService.getEstateById(id);

        if (!estate) {
          res.status(404).json({
            success: false,
            error: 'Estate not found',
          });
          return;
        }

        res.json({
          success: true,
          data: estate,
        });
      } catch (error) {
        console.error('Error fetching estate:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch estate',
        });
      }
    });

    // Get estate by Sreality ID
    this.app.get('/api/estates/sreality/:srealityId', async (req: Request, res: Response): Promise<void> => {
      try {
        const { srealityId } = req.params;
        if (!srealityId) {
          res.status(400).json({
            success: false,
            error: 'Sreality ID is required',
          });
          return;
        }

        const srealityIdNum = parseInt(srealityId);
        if (isNaN(srealityIdNum)) {
          res.status(400).json({
            success: false,
            error: 'Invalid Sreality ID',
          });
          return;
        }

        const estate = await this.dbService.getEstateBySrealityId(srealityIdNum);

        if (!estate) {
          res.status(404).json({
            success: false,
            error: 'Estate not found',
          });
          return;
        }

        res.json({
          success: true,
          data: estate,
        });
      } catch (error) {
        console.error('Error fetching estate:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch estate',
        });
      }
    });

    // Get statistics
    this.app.get('/api/stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.dbService.getStats();
        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics',
        });
      }
    });    // Trigger manual sync
    this.app.post('/api/sync', async (req: Request, res: Response): Promise<void> => {
      try {
        if (this.syncService.isCurrentlyRunning()) {
          res.status(409).json({
            success: false,
            error: 'Sync is already running',
          });
          return;
        }

        // Start sync asynchronously
        this.syncService.triggerManualSync().catch((error: any) => {
          console.error('Manual sync failed:', error);
        });

        res.json({
          success: true,
          message: 'Sync started',
        });
      } catch (error) {
        console.error('Error starting sync:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to start sync',
        });
      }
    });

    // Get sync status
    this.app.get('/api/sync/status', async (req: Request, res: Response) => {
      try {
        const isRunning = this.syncService.isCurrentlyRunning();
        const lastSync = await this.syncService.getLastSyncStatus();

        res.json({
          success: true,
          data: {
            isRunning,
            lastSync,
          },
        });
      } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch sync status',
        });
      }
    });

    // Get sync history
    this.app.get('/api/sync/history', async (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const history = await this.syncService.getSyncHistory(limit);

        res.json({
          success: true,
          data: history,
        });
      } catch (error) {
        console.error('Error fetching sync history:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch sync history',
        });
      }
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    });    // Error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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
