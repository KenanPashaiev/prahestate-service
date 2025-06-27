import { PrismaClient, Estate, SyncLog } from '@prisma/client';
import { EstateData, SyncResult } from '../types';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async createSyncLog(): Promise<SyncLog> {
    return this.prisma.syncLog.create({
      data: {
        status: 'running',
      },
    });
  }

  async updateSyncLog(
    id: string,
    data: Partial<{
      status: string;
      totalItems: number;
      newItems: number;
      updatedItems: number;
      deletedItems: number;
      errorMessage: string;
    }>
  ): Promise<SyncLog> {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        ...data,
        completedAt: data.status === 'completed' || data.status === 'failed' ? new Date() : undefined,
      },
    });
  }

  async upsertEstate(estateData: EstateData): Promise<{ isNew: boolean; estate: Estate }> {
    const existing = await this.prisma.estate.findUnique({
      where: { srealityId: estateData.srealityId },
    });

    const now = new Date();

    if (existing) {
      // Update existing estate
      const estate = await this.prisma.estate.update({
        where: { srealityId: estateData.srealityId },
        data: {
          name: estateData.name,
          category: estateData.category,
          type: estateData.type,
          price: estateData.price,
          priceNote: estateData.priceNote,
          locality: estateData.locality,
          district: estateData.district,
          description: estateData.description,
          gps: estateData.gps,
          images: estateData.images,
          amenities: estateData.amenities,
          meta: estateData.meta,
          srealityUrl: estateData.srealityUrl,
          ownershipType: estateData.ownershipType,
          hasBalcony: estateData.hasBalcony,
          hasTerrace: estateData.hasTerrace,
          powerEfficiency: estateData.powerEfficiency,
          hasElevator: estateData.hasElevator,
          usableArea: estateData.usableArea,
          hasCellar: estateData.hasCellar,
          isFurnished: estateData.isFurnished,
          lastSeen: now,
          isActive: true,
        },
      });

      return { isNew: false, estate: estate as any };
    } else {
      // Create new estate
      const estate = await this.prisma.estate.create({
        data: {
          srealityId: estateData.srealityId,
          name: estateData.name,
          category: estateData.category,
          type: estateData.type,
          price: estateData.price,
          priceNote: estateData.priceNote,
          locality: estateData.locality,
          district: estateData.district,
          description: estateData.description,
          gps: estateData.gps,
          images: estateData.images,
          amenities: estateData.amenities,
          meta: estateData.meta,
          srealityUrl: estateData.srealityUrl,
          ownershipType: estateData.ownershipType,
          hasBalcony: estateData.hasBalcony,
          hasTerrace: estateData.hasTerrace,
          powerEfficiency: estateData.powerEfficiency,
          hasElevator: estateData.hasElevator,
          usableArea: estateData.usableArea,
          hasCellar: estateData.hasCellar,
          isFurnished: estateData.isFurnished,
          firstSeen: now,
          lastSeen: now,
          isActive: true,
        },
      });

      return { isNew: true, estate: estate as any };
    }
  }

  async markInactiveEstates(activeSrealityIds: number[]): Promise<number> {
    const result = await this.prisma.estate.updateMany({
      where: {
        isActive: true,
        srealityId: {
          notIn: activeSrealityIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  async getEstates(filters: {
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
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ estates: Estate[]; total: number }> {
    const {
      category,
      type,
      locality,
      district,
      minPrice,
      maxPrice,
      ownershipType,
      hasBalcony,
      hasTerrace,
      powerEfficiency,
      hasElevator,
      minUsableArea,
      maxUsableArea,
      hasCellar,
      isFurnished,
      isActive = true,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = { isActive };

    if (category !== undefined) where.category = category;
    if (type !== undefined) where.type = type;
    if (locality) where.locality = { contains: locality, mode: 'insensitive' };
    if (district) where.district = { contains: district, mode: 'insensitive' };
    if (ownershipType) where.ownershipType = { contains: ownershipType, mode: 'insensitive' };
    if (hasBalcony !== undefined) where.hasBalcony = hasBalcony;
    if (hasTerrace !== undefined) where.hasTerrace = hasTerrace;
    if (powerEfficiency) where.powerEfficiency = powerEfficiency;
    if (hasElevator !== undefined) where.hasElevator = hasElevator;
    if (hasCellar !== undefined) where.hasCellar = hasCellar;
    if (isFurnished !== undefined) where.isFurnished = isFurnished;
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minUsableArea !== undefined || maxUsableArea !== undefined) {
      where.usableArea = {};
      if (minUsableArea !== undefined) where.usableArea.gte = minUsableArea;
      if (maxUsableArea !== undefined) where.usableArea.lte = maxUsableArea;
    }

    const [estates, total] = await Promise.all([
      this.prisma.estate.findMany({
        where,
        orderBy: { lastUpdated: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.estate.count({ where }),
    ]);

    return { estates: estates as any[], total };
  }

  async getEstateById(id: string): Promise<Estate | null> {
    return this.prisma.estate.findUnique({
      where: { id },
    }) as any;
  }

  async getEstateBySrealityId(srealityId: number): Promise<Estate | null> {
    return this.prisma.estate.findUnique({
      where: { srealityId },
    }) as any;
  }

  async getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    return this.prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getStats(): Promise<{
    totalEstates: number;
    activeEstates: number;
    inactiveEstates: number;
    lastSyncAt: Date | null;
  }> {
    const [totalEstates, activeEstates, inactiveEstates, lastSync] = await Promise.all([
      this.prisma.estate.count(),
      this.prisma.estate.count({ where: { isActive: true } }),
      this.prisma.estate.count({ where: { isActive: false } }),
      this.prisma.syncLog.findFirst({
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    return {
      totalEstates,
      activeEstates,
      inactiveEstates,
      lastSyncAt: lastSync?.completedAt || null,
    };
  }
}

export default DatabaseService;
