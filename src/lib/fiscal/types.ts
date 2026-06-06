import type { FiscalDocument } from "@/lib/types";

export type FiscalPreparation = Pick<
  FiscalDocument,
  | "service_id"
  | "document_type"
  | "amount"
  | "customer_name"
  | "fiscal_description"
>;

export type FiscalProviderResult = {
  providerReference: string | null;
  status: FiscalDocument["status"];
  message: string;
};

export interface FiscalProvider {
  readonly name: string;
  prepare(input: FiscalPreparation): Promise<FiscalProviderResult>;
}
