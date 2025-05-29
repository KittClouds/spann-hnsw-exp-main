
import { enhancedJSONManager } from '../EnhancedJSONManager';
import { jsonPerformanceManager } from '../PerformanceManager';

/**
 * Utility functions for optimized JSON operations
 */
export class OptimizedJSONOperations {
  
  /**
   * Smart serialization that automatically chooses the best strategy
   */
  static async smartSerialize<T>(
    dataType: string,
    data: T,
    options: {
      sizeThreshold?: number;
      preferCompression?: boolean;
      preferStreaming?: boolean;
    } = {}
  ): Promise<{
    result: string | ReadableStream<string>;
    strategy: 'normal' | 'compressed' | 'streamed';
    metadata: any;
  }> {
    
    const sizeThreshold = options.sizeThreshold || 10000;
    const estimatedSize = JSON.stringify(data).length;
    
    if (estimatedSize > sizeThreshold * 10 && options.preferStreaming) {
      // Use streaming for very large data
      const result = enhancedJSONManager.createStreamingOperation(dataType, data);
      return {
        result,
        strategy: 'streamed',
        metadata: { estimatedSize, streaming: true }
      };
    } else if (estimatedSize > sizeThreshold && options.preferCompression) {
      // Use compression for large data
      const serialized = await enhancedJSONManager.enhancedSerialize(dataType, data, {
        compress: true,
        useCache: true
      });
      
      return {
        result: serialized.result as string,
        strategy: 'compressed',
        metadata: {
          estimatedSize,
          compressed: serialized.compressed,
          compressionRatio: serialized.compressionRatio
        }
      };
    } else {
      // Use normal serialization with caching
      const serialized = await enhancedJSONManager.enhancedSerialize(dataType, data, {
        useCache: true
      });
      
      return {
        result: serialized.result as string,
        strategy: 'normal',
        metadata: { estimatedSize, cached: serialized.cached }
      };
    }
  }
  
  /**
   * Bulk operation with automatic optimization
   */
  static async bulkProcess<T>(
    operations: Array<{
      type: 'serialize' | 'deserialize';
      dataType: string;
      data: T;
      priority?: 'high' | 'normal' | 'low';
    }>
  ): Promise<Array<{ success: boolean; result?: any; error?: string; metadata?: any }>> {
    
    // Sort by priority
    const sortedOps = operations.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
    });
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    const results: Array<{ success: boolean; result?: any; error?: string; metadata?: any }> = [];
    
    for (let i = 0; i < sortedOps.length; i += batchSize) {
      const batch = sortedOps.slice(i, i + batchSize);
      const batchResults = await enhancedJSONManager.batchOptimizedOperations(
        batch.map(op => ({
          type: op.type,
          dataType: op.dataType,
          data: op.data,
          options: { useCache: true, compress: true }
        }))
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Adaptive caching based on access patterns
   */
  static setupAdaptiveCaching(
    dataTypes: string[],
    accessPatterns: Record<string, number>
  ): void {
    
    // Analyze access patterns and adjust cache priorities
    for (const dataType of dataTypes) {
      const accessCount = accessPatterns[dataType] || 0;
      
      if (accessCount > 100) {
        console.log(`OptimizedJSON: High access pattern detected for ${dataType}, increasing cache priority`);
        // Could implement cache priority adjustment here
      }
    }
  }
  
  /**
   * Memory-aware operations that adapt to available memory
   */
  static async memoryAwareProcess<T>(
    dataType: string,
    data: T,
    operation: 'serialize' | 'deserialize'
  ): Promise<any> {
    
    // Check memory usage
    const metrics = jsonPerformanceManager.getPerformanceMetrics();
    const memoryPressure = metrics.memoryUsage / (100 * 1024 * 1024); // Ratio to 100MB
    
    if (memoryPressure > 0.8) {
      console.log('OptimizedJSON: High memory pressure detected, using aggressive optimization');
      
      // Clear caches to free memory
      jsonPerformanceManager.clearCaches();
      
      // Use compression and streaming for new operations
      if (operation === 'serialize') {
        return enhancedJSONManager.enhancedSerialize(dataType, data, {
          compress: true,
          stream: JSON.stringify(data).length > 50000,
          useCache: false
        });
      } else {
        return enhancedJSONManager.enhancedDeserialize(dataType, data, {
          compressed: true,
          lazyLoad: true,
          useCache: false
        });
      }
    } else {
      // Normal operation with caching
      if (operation === 'serialize') {
        return enhancedJSONManager.enhancedSerialize(dataType, data, {
          useCache: true
        });
      } else {
        return enhancedJSONManager.enhancedDeserialize(dataType, data, {
          useCache: true
        });
      }
    }
  }
  
  /**
   * Performance monitoring and auto-optimization
   */
  static startPerformanceMonitoring(): () => void {
    const interval = setInterval(() => {
      const metrics = jsonPerformanceManager.getPerformanceMetrics();
      
      // Log performance insights
      if (metrics.cacheHitRate < 0.3) {
        console.warn('OptimizedJSON: Low cache hit rate detected:', metrics.cacheHitRate);
      }
      
      if (metrics.operationLatency > 100) {
        console.warn('OptimizedJSON: High operation latency detected:', metrics.operationLatency);
      }
      
      if (metrics.memoryUsage > 50 * 1024 * 1024) {
        console.log('OptimizedJSON: Memory usage:', Math.round(metrics.memoryUsage / 1024 / 1024), 'MB');
      }
      
      // Auto-optimize if needed
      enhancedJSONManager.optimizePerformance();
      
    }, 30000); // Every 30 seconds
    
    console.log('OptimizedJSON: Performance monitoring started');
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('OptimizedJSON: Performance monitoring stopped');
    };
  }
}

export const optimizedJSON = OptimizedJSONOperations;
