
import { SelectedEntity } from './entityDetailStore';

export function entityToUrl(entity: SelectedEntity): string {
  const encodedType = encodeURIComponent(entity.kind.toLowerCase());
  const encodedLabel = encodeURIComponent(entity.label);
  return `/entity/${encodedType}/${encodedLabel}`;
}

export function urlToEntity(type: string, label: string): SelectedEntity {
  return {
    kind: decodeURIComponent(type),
    label: decodeURIComponent(label)
  };
}

export function generateEntityShareUrl(entity: SelectedEntity): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}${entityToUrl(entity)}`;
}

export function copyEntityUrl(entity: SelectedEntity): void {
  const url = generateEntityShareUrl(entity);
  navigator.clipboard.writeText(url).catch(console.error);
}
