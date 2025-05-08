
import { DocumentId, generateDocumentId } from "../utils/ids";

export interface DocumentInput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Metadata extends Record<string, any> = Record<string, any>
> {
  pageContent: string;
  metadata?: Metadata;
  id?: DocumentId;
}

export interface DocumentInterface<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Metadata extends Record<string, any> = Record<string, any>
> {
  pageContent: string;
  metadata: Metadata;
  id?: DocumentId;
}

/**
 * Interface for interacting with a document.
 */
export class Document<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Metadata extends Record<string, any> = Record<string, any>
> implements DocumentInput, DocumentInterface
{
  pageContent: string;
  metadata: Metadata;
  id: DocumentId;

  constructor(fields: DocumentInput<Metadata>) {
    this.pageContent = fields.pageContent !== undefined ? fields.pageContent.toString() : "";
    this.metadata = fields.metadata ?? ({} as Metadata);
    this.id = fields.id || generateDocumentId();
  }
}
