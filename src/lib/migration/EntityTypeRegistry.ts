
import { schema } from '@/lib/schema';

/**
 * Entity Type Registry - Ensures all entity types are properly registered
 */
export class EntityTypeRegistry {
  private registeredTypes = new Set<string>();

  /**
   * Register core entity types in the schema
   */
  public registerCoreEntityTypes(): void {
    // These should already be registered in schema.ts, but we'll ensure they exist
    const coreTypes = [
      'TAG',
      'MENTION', 
      'CHARACTER',
      'LOCATION',
      'CONCEPT',
      'SCENE',
      'FACTION',
      'ITEM',
      'NPC',
      'EVENT'
    ];

    coreTypes.forEach(type => {
      const existing = schema.getNodeDef(type);
      if (existing) {
        this.registeredTypes.add(type);
      } else {
        console.warn(`Core entity type ${type} not found in schema`);
      }
    });

    console.log(`Registered ${this.registeredTypes.size} core entity types:`, Array.from(this.registeredTypes));
  }

  /**
   * Validate that required entity types are registered
   */
  public validateRegistration(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      missingTypes: [],
      registeredTypes: Array.from(this.registeredTypes)
    };

    const requiredTypes = ['TAG', 'MENTION', 'CHARACTER', 'LOCATION'];
    
    requiredTypes.forEach(type => {
      if (!this.registeredTypes.has(type)) {
        result.missingTypes.push(type);
        result.isValid = false;
      }
    });

    return result;
  }

  /**
   * Get all registered entity types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.registeredTypes);
  }

  /**
   * Check if a specific type is registered
   */
  public isTypeRegistered(type: string): boolean {
    return this.registeredTypes.has(type);
  }
}

interface ValidationResult {
  isValid: boolean;
  missingTypes: string[];
  registeredTypes: string[];
}
