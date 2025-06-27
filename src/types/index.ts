export interface SrealityApiResponse {
  _embedded: {
    estates: SrealityEstate[];
  };
  result_size: number;
  page: number;
  per_page: number;
  page_count: number;
}

export interface SrealityEstate {
  _links: {
    self: {
      href: string;
    };
  };
  hash_id: number;
  name: string;
  category: number;
  type: number;
  price?: number;
  price_czk?: {
    value_raw: number;
    unit: string;
    name: string;
  };
  locality: string;
  description?: string;
  gps?: {
    lat: number;
    lon: number;
  };
  _embedded?: {
    images?: Array<{
      _links: {
        view: {
          href: string;
        };
      };
    }>;
  };
  items?: Array<{
    name: string;
    value: string;
    type: string;
    unit?: string;
  }>;
}

export interface EstateData {
  srealityId: number;
  name: string;
  category: number;
  type: number;
  price?: bigint;
  priceNote?: string;
  locality: string;
  district?: string;
  description?: string;
  gps?: {
    lat: number;
    lon: number;
  };
  images: string[];
  amenities?: any;
  meta?: any;
  srealityUrl?: string;
  ownershipType?: string;
  hasBalcony?: boolean;
  hasTerrace?: boolean;
  powerEfficiency?: string;
  hasElevator?: boolean;
  usableArea?: number;
  hasCellar?: boolean;
  isFurnished?: boolean;
}

export interface SyncResult {
  totalItems: number;
  newItems: number;
  updatedItems: number;
  deletedItems: number;
}

export interface ApiConfig {
  baseUrl: string;
  perPage: number;
  maxPages: number;
  requestDelay: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface AppConfig {
  port: number;
  env: string;
  api: ApiConfig;
  database: DatabaseConfig;
  sync: {
    enabled: boolean;
    schedule: string;
    batchSize: number;
  };
}
