import { PrismaClient, Estate, SyncLog } from '@prisma/client';
import { EstateData, SyncResult } from '../types';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

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
    const slug = slugify(`${estateData.name}-${estateData.srealityId}`);

    const data = {
      slug,
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
    };

    if (existing) {
      // Update existing estate
      const estate = await this.prisma.estate.update({
        where: { srealityId: estateData.srealityId },
        data,
      });

      return { isNew: false, estate: estate as any };
    } else {
      // Create new estate
      const estate = await this.prisma.estate.create({
        data: {
          srealityId: estateData.srealityId,
          ...data,
          firstSeen: now,
        },
      });

      return { isNew: true, estate: estate as any };
    }
  }

  async markInactiveEstates(activeSrealityIds: bigint[]): Promise<number> {
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

  async getEstateBySrealityId(srealityId: bigint): Promise<Estate | null> {
    return this.prisma.estate.findUnique({
      where: { srealityId },
    }) as any;
  }

  async getEstateBySlug(slug: string): Promise<Estate | null> {
    return this.prisma.estate.findUnique({
      where: { slug },
    }) as any;
  }

  async getSyncLogs(page: number = 1, limit: number = 20): Promise<{ logs: SyncLog[]; total: number }> {
    const [logs, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.syncLog.count(),
    ]);
    return { logs, total };
  }

  async getDistrictStats(): Promise<any> {
    return this.prisma.estate.groupBy({
      by: ['district'],
      _count: {
        _all: true,
      },
      where: {
        isActive: true,
        district: {
          not: undefined,
        },
      },
      orderBy: {
        _count: {
          district: 'desc',
        },
      },
    });
  }

  async getLocalityStats(): Promise<any> {
    return this.prisma.estate.groupBy({
      by: ['locality'],
      _count: {
        _all: true,
      },
      where: {
        isActive: true,
        locality: {
          not: undefined,
        },
      },
      orderBy: {
        _count: {
          locality: 'desc',
        },
      },
      take: 50,
    });
  }

  async getOwnershipTypeStats(): Promise<any> {
    return this.prisma.estate.groupBy({
      by: ['ownershipType'],
      _count: {
        _all: true,
      },
      where: {
        isActive: true,
        ownershipType: {
          not: undefined,
        },
      },
      orderBy: {
        _count: {
          ownershipType: 'desc',
        },
      },
    });
  }

  async getPriceDistribution(): Promise<any> {
    return this.prisma.estate.aggregate({
      _avg: {
        price: true,
      },
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
      _count: {
        _all: true,
      },
      where: {
        isActive: true,
        price: {
          not: undefined,
        },
      },
    });
  }

  async getAreaDistribution(): Promise<any> {
    return this.prisma.estate.aggregate({
      _avg: {
        usableArea: true,
      },
      _min: {
        usableArea: true,
      },
      _max: {
        usableArea: true,
      },
      _count: {
        _all: true,
      },
      where: {
        isActive: true,
        usableArea: {
          not: undefined,
        },
      },
    });
  }

  async getSummaryStats(): Promise<any> {
    const [totalEstates, activeEstates, lastSync] = await Promise.all([
      this.prisma.estate.count(),
      this.prisma.estate.count({ where: { isActive: true } }),
      this.prisma.syncLog.findFirst({
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    return {
      totalEstates,
      activeEstates,
      inactiveEstates: totalEstates - activeEstates,
      lastSyncAt: lastSync?.completedAt || null,
    };
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
