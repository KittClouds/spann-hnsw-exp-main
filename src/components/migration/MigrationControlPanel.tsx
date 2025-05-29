
import React, { useState } from 'react';
import { useGraphContext } from '@/contexts/GraphContext';
import { MigrationCoordinator, Phase0Result, MigrationExecutionResult } from '@/lib/migration/MigrationCoordinator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Play, Download } from 'lucide-react';

export const MigrationControlPanel: React.FC = () => {
  const { cy } = useGraphContext();
  const [coordinator] = useState(() => cy ? new MigrationCoordinator(cy) : null);
  const [phase0Result, setPhase0Result] = useState<Phase0Result | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!coordinator) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Graph context not available. Please ensure the graph is loaded.
        </AlertDescription>
      </Alert>
    );
  }

  const handleExecutePhase0 = async () => {
    setIsRunning(true);
    try {
      console.log('Starting Phase 0 execution...');
      const result = await coordinator.executePhase0();
      setPhase0Result(result);
      console.log('Phase 0 completed:', result);
    } catch (error) {
      console.error('Phase 0 failed:', error);
      setPhase0Result({
        success: false,
        steps: [],
        backup: null,
        errors: [error instanceof Error ? error.message : String(error)]
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!phase0Result?.success) {
      alert('Please run Phase 0 successfully first');
      return;
    }

    setIsRunning(true);
    try {
      console.log('Starting migration execution...');
      const result = await coordinator.executeMigration();
      setMigrationResult(result);
      console.log('Migration completed:', result);
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        tagMigration: { success: false, migratedCount: 0, errors: [String(error)], warnings: [] },
        mentionMigration: { success: false, migratedCount: 0, errors: [], warnings: [] },
        rollbackInfo: null
      });
    } finally {
      setIsRunning(false);
    }
  };

  const downloadBackup = () => {
    if (!phase0Result?.backup) return;
    
    const dataStr = JSON.stringify(phase0Result.backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-backup-${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const migrationStatus = coordinator.getMigrationStatus();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Entity Architecture Migration</CardTitle>
          <CardDescription>
            Safe migration of existing entities to canonical format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Current Graph State</h4>
              <div className="text-sm text-muted-foreground">
                <div>Total Tags: {migrationStatus.totalTags}</div>
                <div>Total Mentions: {migrationStatus.totalMentions}</div>
                <div>Tags Need Migration: {migrationStatus.tagsNeedMigration}</div>
                <div>Mentions Need Migration: {migrationStatus.mentionsNeedMigration}</div>
              </div>
              {migrationStatus.migrationNeeded ? (
                <Badge variant="secondary">Migration Recommended</Badge>
              ) : (
                <Badge variant="default">Up to Date</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Phase 0 Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Phase 0: Foundation Building</h4>
              <Button 
                onClick={handleExecutePhase0} 
                disabled={isRunning}
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Execute Phase 0'}
              </Button>
            </div>

            {phase0Result && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Phase 0 Results</span>
                    {phase0Result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {phase0Result.steps.map((step, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{step.name}: {step.message}</span>
                        {step.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>

                  {phase0Result.backup && (
                    <div className="mt-3 pt-3 border-t">
                      <Button onClick={downloadBackup} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Backup
                      </Button>
                    </div>
                  )}

                  {phase0Result.errors.length > 0 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Errors: {phase0Result.errors.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Migration Execution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Execute Migration</h4>
              <Button 
                onClick={handleExecuteMigration}
                disabled={isRunning || !phase0Result?.success}
                variant={phase0Result?.success ? "default" : "secondary"}
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Migrating...' : 'Execute Migration'}
              </Button>
            </div>

            {migrationResult && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Migration Results</span>
                    {migrationResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      Tags Migrated: {migrationResult.tagMigration.migratedCount}
                      {migrationResult.tagMigration.warnings.length > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({migrationResult.tagMigration.warnings.length} warnings)
                        </span>
                      )}
                    </div>
                    <div>
                      Mentions Migrated: {migrationResult.mentionMigration.migratedCount}
                      {migrationResult.mentionMigration.warnings.length > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({migrationResult.mentionMigration.warnings.length} warnings)
                        </span>
                      )}
                    </div>
                  </div>

                  {(migrationResult.tagMigration.errors.length > 0 || migrationResult.mentionMigration.errors.length > 0) && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Migration errors occurred. Check console for details.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
