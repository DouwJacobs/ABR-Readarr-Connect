import NodeCache from 'node-cache';

export type AvailableCacheIds =
  'readarr'
;

const DEFAULT_TTL = 300;
const DEFAULT_CHECK_PERIOD = 120;

class Cache {
  public id: AvailableCacheIds;
  public data: NodeCache;
  public name: string;

  constructor(
    id: AvailableCacheIds,
    name: string,
    options: { stdTtl?: number; checkPeriod?: number } = {}
  ) {
    this.id = id;
    this.name = name;
    this.data = new NodeCache({
      stdTTL: options.stdTtl ?? DEFAULT_TTL,
      checkperiod: options.checkPeriod ?? DEFAULT_CHECK_PERIOD,
    });
  }

  public getStats() {
    return this.data.getStats();
  }

  public flush(): void {
    this.data.flushAll();
  }
}

class CacheManager {
  private availableCaches: Record<AvailableCacheIds, Cache> = {
    readarr: new Cache('readarr', 'Readarr API'),
  };

  public getCache(id: AvailableCacheIds): Cache {
    return this.availableCaches[id];
  }

  public getAllCaches(): Record<string, Cache> {
    return this.availableCaches;
  }
}

const cacheManager = new CacheManager();

export default cacheManager;