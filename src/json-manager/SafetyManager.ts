
import { stateMonitor } from '@/cursor-stability/StateMonitor';
import { stateValidator } from '@/cursor-stability/StateValidator';
import { jsonManager } from './JSONManager';

export interface JSONCorruptionReport {
  dataType: string;
  operationId: string;
  corruptionType: 'schema' | 'structure' | 'encoding' | 'checksum';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRepairable: boolean;
  backupAvailable: boolean;
  timestamp: number;
  details: string;
}

export interface JSONBackupEntry {
  id: string;
  dataType: string;
  operation: string;
  originalData: any;
  serializedData: string;
  timestamp: number;
  checksum: string;
  size: number;
}

export interface SafetyMetrics {
  totalOperations: number;
  corruptionDetected: number;
  autoRepairSuccess: number;
  backupRestoreCount: number;
  healthScore: number;
  lastCheck: number;
}

/**
 * Fort Knox JSON Safety Manager
 * Provides corruption detection, automatic repair, and backup/recovery mechanisms
 */
export class JSONSafetyManager {
  private static instance: JSONSafetyManager | null = null;
  private backups = new Map<string, JSONBackupEntry>();
  private corruptionReports: JSONCorruptionReport[] = [];
  private safetyMetrics: SafetyMetrics = {
    totalOperations: 0,
    corruptionDetected: 0,
    autoRepairSuccess: 0,
    backupRestoreCount: 0,
    healthScore: 100,
    lastCheck: Date.now()
  };
  
  private readonly maxBackups = 100;
  private readonly maxReports = 50;
  
  static getInstance(): JSONSafetyManager {
    if (!this.instance) {
      this.instance = new JSONSafetyManager();
    }
    return this.instance;
  }
  
  /**
   * Create automatic backup before critical operations
   */
  createBackup(dataType: string, operation: string, data: any): string {
    const backupId = `backup-${dataType}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      const serializedData = JSON.stringify(data);
      const checksum = this.calculateChecksum(serializedData);
      
      const backup: JSONBackupEntry = {
        id: backupId,
        dataType,
        operation,
        originalData: data,
        serializedData,
        timestamp: Date.now(),
        checksum,
        size: serializedData.length
      };
      
      this.backups.set(backupId, backup);
      
      // Cleanup old backups
      if (this.backups.size > this.maxBackups) {
        const sortedEntries = Array.from(this.backups.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        const toDelete = sortedEntries.slice(0, sortedEntries.length - this.maxBackups);
        toDelete.forEach(([id]) => this.backups.delete(id));
      }
      
      console.log(`JSONSafety: Created backup ${backupId} for ${dataType} operation ${operation}`);
      return backupId;
    } catch (error) {
      console.error(`JSONSafety: Failed to create backup for ${dataType}:`, error);
      return '';
    }
  }
  
  /**
   * Restore from backup
   */
  restoreFromBackup(backupId: string): any | null {
    const backup = this.backups.get(backupId);
    if (!backup) {
      console.warn(`JSONSafety: Backup ${backupId} not found`);
      return null;
    }
    
    try {
      // Verify backup integrity
      const currentChecksum = this.calculateChecksum(backup.serializedData);
      if (currentChecksum !== backup.checksum) {
        console.error(`JSONSafety: Backup ${backupId} integrity check failed`);
        return null;
      }
      
      this.safetyMetrics.backupRestoreCount++;
      console.log(`JSONSafety: Restored data from backup ${backupId}`);
      return backup.originalData;
    } catch (error) {
      console.error(`JSONSafety: Failed to restore backup ${backupId}:`, error);
      return null;
    }
  }
  
  /**
   * Detect JSON corruption
   */
  detectCorruption(dataType: string, jsonData: string, operationId: string): JSONCorruptionReport | null {
    try {
      // Test 1: Basic JSON parsing
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        return this.createCorruptionReport(dataType, operationId, 'encoding', 'critical', false, 
          'JSON parsing failed: ' + error);
      }
      
      // Test 2: Schema validation
      const schemaValid = jsonManager.validateJSON(dataType, jsonData);
      if (!schemaValid) {
        return this.createCorruptionReport(dataType, operationId, 'schema', 'high', true,
          'Schema validation failed');
      }
      
      // Test 3: Structure integrity
      const structureValid = this.validateStructure(parsedData);
      if (!structureValid) {
        return this.createCorruptionReport(dataType, operationId, 'structure', 'medium', true,
          'Data structure integrity check failed');
      }
      
      // Test 4: Checksum validation if available
      if (parsedData._json_meta?.checksum) {
        const expectedChecksum = parsedData._json_meta.checksum;
        const actualChecksum = this.calculateChecksum(JSON.stringify(parsedData));
        if (expectedChecksum !== actualChecksum) {
          return this.createCorruptionReport(dataType, operationId, 'checksum', 'high', true,
            'Checksum mismatch detected');
        }
      }
      
      return null; // No corruption detected
    } catch (error) {
      return this.createCorruptionReport(dataType, operationId, 'structure', 'critical', false,
        'Corruption detection failed: ' + error);
    }
  }
  
  /**
   * Attempt automatic repair of corrupted data
   */
  attemptAutoRepair(report: JSONCorruptionReport, originalData: any): any | null {
    if (!report.autoRepairable) {
      console.warn(`JSONSafety: Auto-repair not possible for corruption type ${report.corruptionType}`);
      return null;
    }
    
    try {
      switch (report.corruptionType) {
        case 'schema':
          return this.repairSchemaIssues(report.dataType, originalData);
        case 'structure':
          return this.repairStructureIssues(originalData);
        case 'checksum':
          return this.repairChecksumIssues(originalData);
        default:
          return null;
      }
    } catch (error) {
      console.error(`JSONSafety: Auto-repair failed for ${report.operationId}:`, error);
      return null;
    }
  }
  
  /**
   * Perform comprehensive health check
   */
  performHealthCheck(): void {
    const now = Date.now();
    let healthScore = 100;
    
    // Check corruption rate
    const recentReports = this.corruptionReports.filter(r => now - r.timestamp < 3600000); // Last hour
    const corruptionRate = recentReports.length / Math.max(this.safetyMetrics.totalOperations, 1);
    
    if (corruptionRate > 0.1) healthScore -= 30; // High corruption rate
    else if (corruptionRate > 0.05) healthScore -= 15; // Medium corruption rate
    
    // Check backup health
    const backupAge = now - Math.max(...Array.from(this.backups.values()).map(b => b.timestamp));
    if (backupAge > 3600000) healthScore -= 10; // No recent backups
    
    // Check critical corruptions
    const criticalReports = recentReports.filter(r => r.severity === 'critical');
    healthScore -= criticalReports.length * 20;
    
    // Update metrics
    this.safetyMetrics.healthScore = Math.max(0, healthScore);
    this.safetyMetrics.lastCheck = now;
    this.safetyMetrics.corruptionDetected = this.corruptionReports.length;
    
    console.log(`JSONSafety: Health check completed - Score: ${this.safetyMetrics.healthScore}%`);
  }
  
  /**
   * Get safety diagnostics
   */
  getDiagnostics() {
    return {
      metrics: { ...this.safetyMetrics },
      backupCount: this.backups.size,
      recentCorruptions: this.corruptionReports.slice(-10),
      backupSizes: Array.from(this.backups.values()).reduce((sum, b) => sum + b.size, 0),
      oldestBackup: Math.min(...Array.from(this.backups.values()).map(b => b.timestamp)),
      newestBackup: Math.max(...Array.from(this.backups.values()).map(b => b.timestamp))
    };
  }
  
  private createCorruptionReport(
    dataType: string, 
    operationId: string, 
    corruptionType: JSONCorruptionReport['corruptionType'],
    severity: JSONCorruptionReport['severity'],
    autoRepairable: boolean,
    details: string
  ): JSONCorruptionReport {
    const report: JSONCorruptionReport = {
      dataType,
      operationId,
      corruptionType,
      severity,
      autoRepairable,
      backupAvailable: Array.from(this.backups.values()).some(b => b.dataType === dataType),
      timestamp: Date.now(),
      details
    };
    
    this.corruptionReports.push(report);
    
    // Cleanup old reports
    if (this.corruptionReports.length > this.maxReports) {
      this.corruptionReports = this.corruptionReports.slice(-this.maxReports);
    }
    
    console.warn(`JSONSafety: Corruption detected - ${severity} ${corruptionType} in ${dataType}:`, details);
    return report;
  }
  
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  private validateStructure(data: any): boolean {
    if (typeof data !== 'object' || data === null) return false;
    
    // Check for required metadata structure
    if (data._json_meta && typeof data._json_meta !== 'object') return false;
    
    // Check for circular references
    try {
      JSON.stringify(data);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private repairSchemaIssues(dataType: string, data: any): any {
    // Basic schema repair - add missing required fields
    const repaired = { ...data };
    
    if (!repaired._json_meta) {
      repaired._json_meta = {
        dataType,
        version: '1.0.0',
        timestamp: Date.now(),
        repaired: true
      };
    }
    
    this.safetyMetrics.autoRepairSuccess++;
    return repaired;
  }
  
  private repairStructureIssues(data: any): any {
    // Remove circular references and invalid properties
    const repaired = JSON.parse(JSON.stringify(data));
    this.safetyMetrics.autoRepairSuccess++;
    return repaired;
  }
  
  private repairChecksumIssues(data: any): any {
    // Recalculate and update checksum
    const repaired = { ...data };
    if (repaired._json_meta) {
      repaired._json_meta.checksum = this.calculateChecksum(JSON.stringify(repaired));
      repaired._json_meta.repaired = true;
    }
    
    this.safetyMetrics.autoRepairSuccess++;
    return repaired;
  }
}

export const jsonSafetyManager = JSONSafetyManager.getInstance();
