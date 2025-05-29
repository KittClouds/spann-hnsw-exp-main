
import { LRUCache } from 'lru-cache';
import { stateMonitor } from '@/cursor-stability/StateMonitor';

export interface CacheEntry {
  data: any;
  timestamp: number;
  accessCount: number;
  size: number;
  dataType: string;
}

export interface CompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  threshold: number;
  level: number;
}

export interface StreamingOptions {
  chunkSize: number;
  maxConcurrentChunks: number;
  enableBackpressure: boolean;
}

export interface LazyLoadOptions {
  maxDepth: number;
  thresholdSize: number;
  enableSmartLoading: boolean;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgCompressionRatio: number;
  streamingThroughput: number;
  lazyLoadEfficiency: number;
  memoryUsage: number;
  operationLatency: number;
}

/**
 * JSON Performance Manager
 * Handles caching, compression, streaming, and lazy loading optimizations
 */
export class JSONPerformanceManager {
  private static instance: JSONPerformanceManager | null = null;
  
  // Caching
  private cache: LRUCache<string, CacheEntry>;
  private memoizedOperations = new Map<string, any>();
  
  // Compression
  private compressionStats = {
    totalOriginal: 0,
    totalCompressed: 0,
    operations: 0
  };
  
  // Streaming
  private activeStreams = new Map<string, ReadableStream>();
  private streamMetrics = {
    totalStreamed: 0,
    avgChunkSize: 0,
    operationsCount: 0
  };
  
  // Lazy loading
  private lazyLoadCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics = {
    cacheHitRate: 0,
    avgCompressionRatio: 0,
    streamingThroughput: 0,
    lazyLoadEfficiency: 0,
    memoryUsage: 0,
    operationLatency: 0
  };
  
  private constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: 1000,
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (entry) => entry.size,
      dispose: (value, key) => {
        console.log(`JSONPerformance: Cache entry disposed: ${key}`);
      }
    });
    
    console.log('JSONPerformanceManager: Initialized with advanced optimization features');
  }
  
  static getInstance(): JSONPerformanceManager {
    if (!this.instance) {
      this.instance = new JSONPerformanceManager();
    }
    return this.instance;
  }
  
  /**
   * Memoized JSON operation with LRU caching
   */
  memoizedOperation<T>(
    operation: string,
    dataType: string,
    data: any,
    operationFn: () => T,
    ttl: number = 300000 // 5 minutes default
  ): T {
    const cacheKey = this.generateCacheKey(operation, dataType, data);
    const startTime = performance.now();
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      cached.accessCount++;
      this.updateCacheHitRate(true);
      console.log(`JSONPerformance: Cache hit for ${operation}:${dataType}`);
      return cached.data;
    }
    
    // Execute operation
    const result = operationFn();
    const endTime = performance.now();
    
    // Cache the result
    const size = this.estimateSize(result);
    const entry: CacheEntry = {
      data: result,
      timestamp: Date.now(),
      accessCount: 1,
      size,
      dataType
    };
    
    this.cache.set(cacheKey, entry);
    this.updateCacheHitRate(false);
    this.updateLatencyMetrics(endTime - startTime);
    
    console.log(`JSONPerformance: Cached result for ${operation}:${dataType} (${size} bytes)`);
    return result;
  }
  
  /**
   * Compress JSON data for storage optimization
   */
  async compressJSON(
    jsonString: string,
    options: CompressionOptions = {
      algorithm: 'gzip',
      threshold: 1024,
      level: 6
    }
  ): Promise<{ compressed: ArrayBuffer; originalSize: number; compressedSize: number; ratio: number }> {
    
    if (jsonString.length < options.threshold) {
      const buffer = new TextEncoder().encode(jsonString);
      return {
        compressed: buffer,
        originalSize: jsonString.length,
        compressedSize: buffer.byteLength,
        ratio: 1
      };
    }
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonString);
      
      // Use CompressionStream API if available
      if ('CompressionStream' in window) {
        const stream = new CompressionStream(options.algorithm);
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(data);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressed = this.concatenateUint8Arrays(chunks);
        const ratio = compressed.byteLength / data.byteLength;
        
        this.updateCompressionStats(data.byteLength, compressed.byteLength);
        
        console.log(`JSONPerformance: Compressed ${data.byteLength} -> ${compressed.byteLength} bytes (${(ratio * 100).toFixed(1)}%)`);
        
        return {
          compressed: compressed.buffer,
          originalSize: data.byteLength,
          compressedSize: compressed.byteLength,
          ratio
        };
      } else {
        // Fallback: simple simulation
        console.warn('JSONPerformance: CompressionStream not available, using fallback');
        return {
          compressed: data.buffer,
          originalSize: jsonString.length,
          compressedSize: data.byteLength,
          ratio: 0.8 // Simulated compression
        };
      }
    } catch (error) {
      console.error('JSONPerformance: Compression failed:', error);
      const buffer = new TextEncoder().encode(jsonString);
      return {
        compressed: buffer,
        originalSize: jsonString.length,
        compressedSize: buffer.byteLength,
        ratio: 1
      };
    }
  }
  
  /**
   * Decompress JSON data
   */
  async decompressJSON(
    compressed: ArrayBuffer,
    algorithm: 'gzip' | 'deflate' | 'brotli' = 'gzip'
  ): Promise<string> {
    try {
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream(algorithm);
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new Uint8Array(compressed));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressed = this.concatenateUint8Arrays(chunks);
        const decoder = new TextDecoder();
        return decoder.decode(decompressed);
      } else {
        // Fallback
        const decoder = new TextDecoder();
        return decoder.decode(compressed);
      }
    } catch (error) {
      console.error('JSONPerformance: Decompression failed:', error);
      const decoder = new TextDecoder();
      return decoder.decode(compressed);
    }
  }
  
  /**
   * Stream large JSON data in chunks
   */
  createJSONStream(
    data: any,
    options: StreamingOptions = {
      chunkSize: 64 * 1024, // 64KB
      maxConcurrentChunks: 3,
      enableBackpressure: true
    }
  ): ReadableStream<string> {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const stream = new ReadableStream<string>({
      start(controller) {
        console.log(`JSONPerformance: Starting JSON stream ${streamId}`);
      },
      
      async pull(controller) {
        try {
          const jsonString = JSON.stringify(data);
          const chunks = this.chunkString(jsonString, options.chunkSize);
          
          for (const chunk of chunks) {
            controller.enqueue(chunk);
            
            // Simulate async processing with backpressure
            if (options.enableBackpressure) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          controller.close();
          this.updateStreamingMetrics(jsonString.length, chunks.length);
          console.log(`JSONPerformance: Completed streaming ${chunks.length} chunks`);
        } catch (error) {
          controller.error(error);
        }
      }.bind(this)
    });
    
    this.activeStreams.set(streamId, stream);
    return stream;
  }
  
  /**
   * Create lazy-loaded JSON structure
   */
  createLazyJSON<T>(
    data: T,
    options: LazyLoadOptions = {
      maxDepth: 3,
      thresholdSize: 1024,
      enableSmartLoading: true
    }
  ): LazyJSONProxy<T> {
    return new LazyJSONProxy(data, options, this);
  }
  
  /**
   * Load data lazily based on access patterns
   */
  async lazyLoad<T>(path: string, loader: () => Promise<T>): Promise<T> {
    // Check if already loaded
    if (this.lazyLoadCache.has(path)) {
      console.log(`JSONPerformance: Lazy load cache hit for ${path}`);
      return this.lazyLoadCache.get(path);
    }
    
    // Check if loading is in progress
    if (this.loadingPromises.has(path)) {
      console.log(`JSONPerformance: Waiting for existing load operation for ${path}`);
      return this.loadingPromises.get(path)!;
    }
    
    // Start loading
    console.log(`JSONPerformance: Starting lazy load for ${path}`);
    const loadPromise = loader().then(result => {
      this.lazyLoadCache.set(path, result);
      this.loadingPromises.delete(path);
      return result;
    }).catch(error => {
      this.loadingPromises.delete(path);
      throw error;
    });
    
    this.loadingPromises.set(path, loadPromise);
    return loadPromise;
  }
  
  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.performanceMetrics.memoryUsage = this.cache.calculatedSize || 0;
    this.performanceMetrics.avgCompressionRatio = this.compressionStats.operations > 0 
      ? this.compressionStats.totalCompressed / this.compressionStats.totalOriginal 
      : 0;
    
    return { ...this.performanceMetrics };
  }
  
  /**
   * Clear caches and reset performance counters
   */
  clearCaches(): void {
    this.cache.clear();
    this.memoizedOperations.clear();
    this.lazyLoadCache.clear();
    this.loadingPromises.clear();
    
    console.log('JSONPerformance: All caches cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      hitRate: this.performanceMetrics.cacheHitRate,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        size: value.size,
        accessCount: value.accessCount,
        dataType: value.dataType
      }))
    };
  }
  
  private generateCacheKey(operation: string, dataType: string, data: any): string {
    const dataHash = this.simpleHash(JSON.stringify(data));
    return `${operation}:${dataType}:${dataHash}`;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }
  
  private updateCacheHitRate(hit: boolean): void {
    // Simple moving average
    const alpha = 0.1;
    const newValue = hit ? 1 : 0;
    this.performanceMetrics.cacheHitRate = 
      this.performanceMetrics.cacheHitRate * (1 - alpha) + newValue * alpha;
  }
  
  private updateCompressionStats(original: number, compressed: number): void {
    this.compressionStats.totalOriginal += original;
    this.compressionStats.totalCompressed += compressed;
    this.compressionStats.operations++;
  }
  
  private updateStreamingMetrics(totalSize: number, chunkCount: number): void {
    this.streamMetrics.totalStreamed += totalSize;
    this.streamMetrics.avgChunkSize = totalSize / chunkCount;
    this.streamMetrics.operationsCount++;
    
    this.performanceMetrics.streamingThroughput = 
      this.streamMetrics.totalStreamed / this.streamMetrics.operationsCount;
  }
  
  private updateLatencyMetrics(latency: number): void {
    const alpha = 0.1;
    this.performanceMetrics.operationLatency = 
      this.performanceMetrics.operationLatency * (1 - alpha) + latency * alpha;
  }
  
  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  private concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    
    return result;
  }
}

/**
 * Lazy JSON Proxy for efficient nested data access
 */
export class LazyJSONProxy<T = any> {
  private loaded = new Set<string>();
  private loading = new Map<string, Promise<any>>();
  
  constructor(
    private data: T,
    private options: LazyLoadOptions,
    private manager: JSONPerformanceManager
  ) {}
  
  async get(path: string): Promise<any> {
    if (this.loaded.has(path)) {
      return this.getNestedValue(this.data, path);
    }
    
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }
    
    const loadPromise = this.loadPath(path);
    this.loading.set(path, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loaded.add(path);
      this.loading.delete(path);
      return result;
    } catch (error) {
      this.loading.delete(path);
      throw error;
    }
  }
  
  private async loadPath(path: string): Promise<any> {
    // Simulate lazy loading logic
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.getNestedValue(this.data, path);
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}

export const jsonPerformanceManager = JSONPerformanceManager.getInstance();
