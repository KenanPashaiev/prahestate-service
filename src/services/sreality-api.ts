import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { SrealityApiResponse, SrealityEstate, EstateData } from '../types';
import config from '../config';

export class SrealityApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'PrahEstate-Service/1.0',
        'Accept': 'application/json',
      },
    });
  }

  async fetchEstates(page: number = 1, params: any = {}): Promise<SrealityApiResponse> {
    try {
      const response: AxiosResponse<SrealityApiResponse> = await this.client.get('', {
        params: {
          category_main_cb: 1, // For sale
          category_type_cb: 1, // Apartments
          locality_region_id: 10, // Prague
          per_page: config.api.perPage,
          page,
          ...params,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch estates from page ${page}:`, error);
      throw error;
    }
  }

  async fetchAllEstates(): Promise<SrealityEstate[]> {
    const allEstates: SrealityEstate[] = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        console.log(`Fetching page ${currentPage}/${totalPages}...`);
        
        const response = await this.fetchEstates(currentPage);
        
        if (response._embedded?.estates) {
          allEstates.push(...response._embedded.estates);
        }

        // Better handling of pagination
        const apiPageCount = response.page_count || 1;
        const resultSize = response.result_size || allEstates.length;
        const perPage = response.per_page || config.api.perPage;
        const currentPageItems = response._embedded?.estates?.length || 0;
        
        // Calculate total pages from result size if page_count is not reliable
        const calculatedPages = Math.ceil(resultSize / perPage);
        totalPages = Math.min(apiPageCount || calculatedPages, config.api.maxPages);
        
        console.log(`API Response: result_size=${resultSize}, page_count=${apiPageCount}, per_page=${perPage}, current_page_items=${currentPageItems}, calculated_pages=${calculatedPages}`);
        
        // If this page has fewer items than per_page, we've reached the end
        if (currentPageItems < perPage && currentPageItems > 0) {
          console.log(`Last page detected: got ${currentPageItems} items, expected ${perPage}`);
          break;
        }
        
        currentPage++;

        // Add delay between requests to be respectful
        if (currentPage <= totalPages) {
          await this.delay(config.api.requestDelay);
        }

      } while (currentPage <= totalPages && allEstates.length < (config.api.maxPages * config.api.perPage));

      console.log(`Fetched ${allEstates.length} estates from ${currentPage - 1} pages`);
      return allEstates;

    } catch (error) {
      console.error('Failed to fetch all estates:', error);
      throw error;
    }
  }

  transformEstate(estate: SrealityEstate): EstateData {
    const images: string[] = [];
    
    if (estate._embedded?.images) {
      estate._embedded.images.forEach(img => {
        if (img._links?.view?.href) {
          images.push(img._links.view.href);
        }
      });
    }

    // Extract price information
    let price: bigint | undefined;
    let priceNote: string | undefined;

    if (estate.price) {
      price = BigInt(estate.price);
    } else if (estate.price_czk?.value_raw) {
      price = BigInt(estate.price_czk.value_raw);
      priceNote = `${estate.price_czk.name} (${estate.price_czk.unit})`;
    }

    // Transform amenities from items array and extract specific fields
    const amenities: any = {};
    let ownershipType: string | undefined;
    let hasBalcony: boolean | undefined;
    let hasTerrace: boolean | undefined;
    let powerEfficiency: string | undefined;
    let hasElevator: boolean | undefined;
    let usableArea: number | undefined;
    let hasCellar: boolean | undefined;
    let isFurnished: boolean | undefined;
    let district: string | undefined;

    if (estate.items) {
      estate.items.forEach(item => {
        amenities[item.name] = {
          value: item.value,
          type: item.type,
          unit: item.unit,
        };

        // Extract specific properties based on item names
        const itemName = item.name.toLowerCase();
        const itemValue = item.value.toLowerCase();

        // Ownership type (Personal ownership, Cooperative, etc.)
        if (itemName.includes('ownership') || itemName.includes('vlastnictví')) {
          ownershipType = item.value;
        }

        // Balcony
        if (itemName.includes('balcony') || itemName.includes('balkón')) {
          hasBalcony = itemValue === 'yes' || itemValue === 'ano' || itemValue === 'true';
        }

        // Terrace
        if (itemName.includes('terrace') || itemName.includes('terasa')) {
          hasTerrace = itemValue === 'yes' || itemValue === 'ano' || itemValue === 'true';
        }

        // Power efficiency
        if (itemName.includes('energy') || itemName.includes('energetic') || itemName.includes('energetick')) {
          powerEfficiency = item.value;
        }

        // Elevator
        if (itemName.includes('elevator') || itemName.includes('výtah') || itemName.includes('lift')) {
          hasElevator = itemValue === 'yes' || itemValue === 'ano' || itemValue === 'true';
        }

        // Usable area
        if (itemName.includes('usable area') || itemName.includes('užitná plocha') || itemName.includes('floor area')) {
          const areaMatch = item.value.match(/(\d+(?:\.\d+)?)/);
          if (areaMatch && areaMatch[1]) {
            usableArea = parseFloat(areaMatch[1]);
          }
        }

        // Cellar
        if (itemName.includes('cellar') || itemName.includes('sklep') || itemName.includes('basement')) {
          hasCellar = itemValue === 'yes' || itemValue === 'ano' || itemValue === 'true';
        }

        // Furnished
        if (itemName.includes('furnished') || itemName.includes('zařízený') || itemName.includes('furniture')) {
          isFurnished = itemValue === 'yes' || itemValue === 'ano' || itemValue === 'furnished' || itemValue === 'zařízený';
        }
      });
    }

    // Extract district from locality (Prague specific)
    if (estate.locality && estate.locality.includes('Praha')) {
      const districtMatch = estate.locality.match(/Praha\s*(\d+)/i);
      if (districtMatch) {
        district = `Praha ${districtMatch[1]}`;
      } else if (estate.locality.toLowerCase().includes('praha')) {
        district = estate.locality;
      }
    }

    // Generate Sreality URL
    const srealityUrl = estate._links?.self?.href 
      ? `https://www.sreality.cz${estate._links.self.href.replace('/api/en/v2', '')}`
      : `https://www.sreality.cz/detail/${estate.hash_id}`;

    return {
      srealityId: BigInt(estate.hash_id),
      name: estate.name,
      category: estate.category,
      type: estate.type,
      price,
      priceNote,
      locality: estate.locality,
      district,
      description: estate.description,
      gps: estate.gps,
      images,
      amenities: Object.keys(amenities).length > 0 ? amenities : undefined,
      meta: {
        links: estate._links,
        originalData: estate,
      },
      srealityUrl,
      ownershipType,
      hasBalcony,
      hasTerrace,
      powerEfficiency,
      hasElevator,
      usableArea,
      hasCellar,
      isFurnished,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SrealityApiClient;
