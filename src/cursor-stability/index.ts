
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
  StateHealth
} from './StateManager';

export type { 
  ValidationResult, 
  ContentIntegrity
} from './StateValidator';

export type { 
  MonitorMetrics, 
  AlertThresholds
} from './StateMonitor';

// Fort Knox JSON Management System exports
export { jsonManager, JSONRegistry } from '@/json-manager';
export type { JSONOperation, SerializationAdapter, JSONManagerOptions } from '@/json-manager';
