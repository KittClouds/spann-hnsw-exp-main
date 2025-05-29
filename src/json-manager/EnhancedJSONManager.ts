
import { JSONManager, SerializationAdapter, JSONManagerOptions } from './JSONManager';
import { jsonPerformanceManager, CompressionOptions, StreamingOptions, LazyLoadOptions } from './PerformanceManager';
import { jsonSafetyManager } from './SafetyManager';

export interface EnhancedJSONManagerOptions extends JSONManagerOptions {
  enableCaching?: boolean;
  enableCompression?: boolean;
  enableStreaming?: boolean;
  enableLazyLoading?: boolean;
  compressionOptions?: CompressionOptions;
  streamingOptions?: StreamingOptions;
  lazyLoadOptions?: LazyLoadOptions;
}

/**
 * Enhanced JSON Manager with Performance Optimizations
 * Extends the base JSONManager with caching, compression, streaming, and lazy loading
 */
export class EnhancedJSONManager extends JSONManager {
  private static enhancedInstance: EnhancedJSONManager | null = null;
  private enhancedOptions: Required<EnhancedJSONManagerOptions>;
  
  private constructor(options: EnhancedJSONManagerOptions = {}) {
    super(options);
    
    this.enhancedOptions = {
      enableMonitoring: true,
      enableValidation: true,
      enableBackup: true,
      enableSchemaValidation: true,
      enableAutoMigration: true,
      compressionThreshold: 10000,
      enableCaching: true,
      enableCompression: true,
      enableStreaming: true,
      enableLazyLoading: true,
      compressionOptions: {
        algorithm: 'gzip',
        threshold: 1024,
        level: 6
      },
      streamingOptions: {
        chunkSize: 64 * 1024,
        maxConcurrentChunks: 3,
        enableBackpressure: true
      },
      lazyLoadOptions: {
        maxDepth: 3,
        thresholdSize: 1024,
        enableSmartLoading: true
      },
      ...options
    };
    
    console.log('EnhancedJSONManager: Initialized with performance optimizations');
  }
  
  static getEnhancedInstance(options?: EnhancedJSONManagerOptions): EnhancedJSONManager {
    if (!this.enhancedInstance) {
      this.enhancedInstance = new EnhancedJSONManager(options);
    }
    return this.enhancedInstance;
  }
  
  /**
   * Enhanced serialize with caching and compression
   */
  async enhancedSerialize<T>(
    dataType: string, 
    data: T,
    options: {
      useCache?: boolean;
      compress?: boolean;
      stream?: boolean;
    } = {}
  ): Promise<{ 
    result: string | ReadableStream<string>; 
    compressed?: boolean; 
    cached?: boolean;
    compressionRatio?: number;
  }> {
    
    const useCache = options.useCache ?? this.enhancedOptions.enableCaching;
    const compress = options.compress ?? this.enhancedOptions.enableCompression;
    const stream = options.stream ?? this.enhancedOptions.enableStreaming;
    
    try {
      // Check if we should use caching
      if (useCache) {
        return jsonPerformanceManager.memoizedOperation(
          'enhancedSerialize',
          dataType,
          data,
          () => this.performSerializationWithOptimizations(dataType, data, { compress, stream })
        );
      }
      
      return await this.performSerializationWithOptimizations(dataType, data, { compress, stream });
      
    } catch (error) {
      console.error(`EnhancedJSONManager: Enhanced serialization failed for ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Enhanced deserialize with caching and decompression
   */
  async enhancedDeserialize<T>(
    dataType: string,
    input: string | ArrayBuffer,
    options: {
      useCache?: boolean;
      compressed?: boolean;
      lazyLoad?: boolean;
    } = {}
  ): Promise<{
    result: T;
    cached?: boolean;
    decompressed?: boolean;
    lazy?: boolean;
  }> {
    
    const useCache = options.useCache ?? this.enhancedOptions.enableCaching;
    const compressed = options.compressed ?? false;
    const lazyLoad = options.lazyLoad ?? this.enhancedOptions.enableLazyLoading;
    
    try {
      let jsonString: string;
      let decompressed = false;
      
      // Handle decompression if needed
      if (compressed && input instanceof ArrayBuffer) {
        jsonString = await jsonPerformanceManager.decompressJSON(input);
        decompressed = true;
      } else if (typeof input === 'string') {
        jsonString = input;
      } else {
        throw new Error('Invalid input type for deserialization');
      }
      
      // Use caching if enabled
      if (useCache) {
        const result = jsonPerformanceManager.memoizedOperation(
          'enhancedDeserialize',
          dataType,
          jsonString,
          () => this.deserialize<T>(dataType, jsonString)
        );
        
        return {
          result,
          cached: true,
          decompressed,
          lazy: false
        };
      }
      
      // Regular deserialization
      const result = this.deserialize<T>(dataType, jsonString);
      
      // Apply lazy loading if enabled and result is large/complex
      if (lazyLoad && this.shouldUseLazyLoading(result)) {
        const lazyResult = jsonPerformanceManager.createLazyJSON(result, this.enhancedOptions.lazyLoadOptions);
        return {
          result: lazyResult as T,
          cached: false,
          decompressed,
          lazy: true
        };
      }
      
      return {
        result,
        cached: false,
        decompressed,
        lazy: false
      };
      
    } catch (error) {
      console.error(`EnhancedJSONManager: Enhanced deserialization failed for ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a streaming JSON operation for large datasets
   */
  createStreamingOperation<T>(
    dataType: string,
    data: T,
    options?: StreamingOptions
  ): ReadableStream<string> {
    const streamOptions = { ...this.enhancedOptions.streamingOptions, ...options };
    return jsonPerformanceManager.createJSONStream(data, streamOptions);
  }
  
  /**
   * Compress JSON data for storage optimization
   */
  async compressData(
    jsonString: string,
    options?: CompressionOptions
  ): Promise<{ compressed: ArrayBuffer; ratio: number; originalSize: number; compressedSize: number }> {
    const compressionOptions = { ...this.enhancedOptions.compressionOptions, ...options };
    return jsonPerformanceManager.compressJSON(jsonString, compressionOptions);
  }
  
  /**
   * Batch operations with performance optimizations
   */
  async batchOptimizedOperations<T>(
    operations: Array<{
      type: 'serialize' | 'deserialize';
      dataType: string;
      data: any;
      options?: any;
    }>
  ): Promise<Array<{ success: boolean; result?: any; error?: string }>> {
    
    const results: Array<{ success: boolean; result?: any; error?: string }> = [];
    
    // Group operations by type for optimization
    const serializeOps = operations.filter(op => op.type === 'serialize');
    const deserializeOps = operations.filter(op => op.type === 'deserialize');
    
    // Process serialization operations
    for (const op of serializeOps) {
      try {
        const result = await this.enhancedSerialize(op.dataType, op.data, op.options);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Process deserialization operations
    for (const op of deserializeOps) {
      try {
        const result = await this.enhancedDeserialize(op.dataType, op.data, op.options);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    console.log(`EnhancedJSONManager: Batch processed ${operations.length} operations`);
    return results;
  }
  
  /**
   * Get comprehensive performance diagnostics
   */
  getPerformanceDiagnostics() {
    const baseStats = this.getOperationStats();
    const performanceMetrics = jsonPerformanceManager.getPerformanceMetrics();
    const cacheStats = jsonPerformanceManager.getCacheStats();
    const safetyDiag = jsonSafetyManager.getDiagnostics();
    
    return {
      operations: baseStats,
      performance: performanceMetrics,
      cache: cacheStats,
      safety: safetyDiag,
      optimization: {
        cachingEnabled: this.enhancedOptions.enableCaching,
        compressionEnabled: this.enhancedOptions.enableCompression,
        streamingEnabled: this.enhancedOptions.enableStreaming,
        lazyLoadingEnabled: this.enhancedOptions.enableLazyLoading
      }
    };
  }
  
  /**
   * Optimize performance based on usage patterns
   */
  optimizePerformance(): void {
    const metrics = jsonPerformanceManager.getPerformanceMetrics();
    
    // Auto-tune cache size based on hit rate
    if (metrics.cacheHitRate < 0.5) {
      console.log('EnhancedJSONManager: Low cache hit rate detected, consider increasing cache size');
    }
    
    // Optimize compression based on ratio
    if (metrics.avgCompressionRatio > 0.9) {
      console.log('EnhancedJSONManager: Low compression efficiency, consider adjusting threshold');
    }
    
    // Memory optimization
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      console.log('EnhancedJSONManager: High memory usage detected, clearing old caches');
      jsonPerformanceManager.clearCaches();
    }
    
    console.log('EnhancedJSONManager: Performance optimization completed');
  }
  
  private async performSerializationWithOptimizations<T>(
    dataType: string,
    data: T,
    options: { compress?: boolean; stream?: boolean }
  ): Promise<{ 
    result: string | ReadableStream<string>; 
    compressed?: boolean; 
    cached?: boolean;
    compressionRatio?: number;
  }> {
    
    // Regular serialization first
    const jsonString = this.serialize(dataType, data);
    
    // Check if we should use streaming for large data
    if (options.stream && jsonString.length > this.enhancedOptions.compressionThreshold) {
      const stream = this.createStreamingOperation(dataType, data);
      return {
        result: stream,
        compressed: false,
        cached: false
      };
    }
    
    // Check if we should compress
    if (options.compress && jsonString.length > this.enhancedOptions.compressionOptions.threshold) {
      const compressionResult = await this.compressData(jsonString);
      
      // Return compressed data as base64 string for storage
      const compressedString = btoa(String.fromCharCode(...new Uint8Array(compressionResult.compressed)));
      
      return {
        result: compressedString,
        compressed: true,
        cached: false,
        compressionRatio: compressionResult.ratio
      };
    }
    
    return {
      result: jsonString,
      compressed: false,
      cached: false
    };
  }
  
  private shouldUseLazyLoading(data: any): boolean {
    if (!this.enhancedOptions.enableLazyLoading) return false;
    
    const size = JSON.stringify(data).length;
    return size > this.enhancedOptions.lazyLoadOptions.thresholdSize;
  }
  
  /**
   * Clear all performance caches
   */
  clearPerformanceCaches(): void {
    jsonPerformanceManager.clearCaches();
    console.log('EnhancedJSONManager: Performance caches cleared');
  }
}

export const enhancedJSONManager = EnhancedJSONManager.getEnhancedInstance();
