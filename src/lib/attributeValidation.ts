
import { TypedAttribute, AttributeValidationError } from '@/types/attributes';
import { EntityBlueprint } from '@/types/blueprints';

export function validateAttributes(
  attributes: TypedAttribute[], 
  blueprint: EntityBlueprint
): AttributeValidationError[] {
  const errors: AttributeValidationError[] = [];

  blueprint.templates.forEach(template => {
    const attribute = attributes.find(attr => attr.name === template.name);

    // Check required fields
    if (template.required && (!attribute || !attribute.value)) {
      errors.push({
        field: template.name,
        message: `${template.name} is required`
      });
    }

    // Type validation
    if (attribute) {
      switch (template.type) {
        case 'Number':
          if (typeof attribute.value !== 'number' || isNaN(attribute.value as number)) {
            errors.push({
              field: template.name,
              message: `${template.name} must be a valid number`
            });
          }
          break;
        case 'Date':
          if (typeof attribute.value === 'string') {
            const date = new Date(attribute.value);
            if (isNaN(date.getTime())) {
              errors.push({
                field: template.name,
                message: `${template.name} must be a valid date`
              });
            }
          }
          break;
        case 'URL':
          if (typeof attribute.value === 'string' && attribute.value) {
            try {
              new URL(attribute.value);
            } catch {
              errors.push({
                field: template.name,
                message: `${template.name} must be a valid URL`
              });
            }
          }
          break;
      }
    }
  });

  return errors;
}
