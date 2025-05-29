export { CursorStabilityManager, cursorStabilityManager } from './CursorStabilityManager';
export { useHardenedEditorBuffer } from './useHardenedEditorBuffer';
export type { BufferState, EditorState, OperationLock } from './CursorStabilityManager';

export { StateManager, stateManager } from './StateManager';
export { StateValidator, stateValidator } from './StateValidator';
export { StateMonitor, stateMonitor } from './StateMonitor';
export { useHardenedState } from './useHardenedState';

export type { 
  StateSnapshot, 
  StateOperation, 
  StateHealth,
  ValidationResult,
  ContentIntegrity,
  MonitorMetrics,
  AlertThresholds
} from './StateManager';
