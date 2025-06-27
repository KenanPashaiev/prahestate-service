import cron from 'node-cron';
import SrealityApiClient from './sreality-api';
import DatabaseService from './database';
import { SyncResult } from '../types';
import config from '../config';

export class SyncService {
  private apiClient: SrealityApiClient;
  private dbService: DatabaseService;
  private isRunning: boolean = false;

  constructor() {
    this.apiClient = new SrealityApiClient();
    this.dbService = new DatabaseService();
  }

  async initialize(): Promise<void> {
    await this.dbService.connect();
    
    if (config.sync.enabled) {
      this.scheduleSyncTask();
      console.log(`Sync scheduled: ${config.sync.schedule}`);
    }
  }

  private scheduleSyncTask(): void {
    cron.schedule(config.sync.schedule, async () => {
      console.log('Starting scheduled sync...');
      try {
        await this.performSync();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    });
  }

  async performSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already running');
    }

    this.isRunning = true;
    const syncLog = await this.dbService.createSyncLog();

    try {
      console.log('Starting estate sync...');
      
      // Fetch all estates from API
      const estates = await this.apiClient.fetchAllEstates();
      const totalItems = estates.length;
      
      console.log(`Processing ${totalItems} estates...`);

      let newItems = 0;
      let updatedItems = 0;
      const activeSrealityIds: number[] = [];

      // Process estates in batches
      for (let i = 0; i < estates.length; i += config.sync.batchSize) {
        const batch = estates.slice(i, i + config.sync.batchSize);
        
        for (const estate of batch) {
          try {
            const estateData = this.apiClient.transformEstate(estate);
            activeSrealityIds.push(estateData.srealityId);
            
            const result = await this.dbService.upsertEstate(estateData);
            
            if (result.isNew) {
              newItems++;
            } else {
              updatedItems++;
            }
          } catch (error) {
            console.error(`Failed to process estate ${estate.hash_id}:`, error);
          }
        }

        // Log progress
        console.log(`Processed ${Math.min(i + config.sync.batchSize, estates.length)}/${totalItems} estates`);
      }

      // Mark inactive estates
      const deletedItems = await this.dbService.markInactiveEstates(activeSrealityIds);

      const syncResult: SyncResult = {
        totalItems,
        newItems,
        updatedItems,
        deletedItems,
      };

      // Update sync log
      await this.dbService.updateSyncLog(syncLog.id, {
        status: 'completed',
        totalItems,
        newItems,
        updatedItems,
        deletedItems,
      });

      console.log('Sync completed successfully:', syncResult);
      return syncResult;

    } catch (error) {
      console.error('Sync failed:', error);
      
      await this.dbService.updateSyncLog(syncLog.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async triggerManualSync(): Promise<SyncResult> {
    console.log('Manual sync triggered');
    return this.performSync();
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  async getLastSyncStatus(): Promise<any> {
    const logs = await this.dbService.getRecentSyncLogs(1);
    return logs[0] || null;
  }

  async getSyncHistory(limit: number = 10): Promise<any[]> {
    return this.dbService.getRecentSyncLogs(limit);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down sync service...');
    await this.dbService.disconnect();
  }
}

export default SyncService;
