import type { FiscalProvider, FiscalProviderResult } from "@/lib/fiscal/types";

export class ManualFiscalProvider implements FiscalProvider {
  readonly name = "MANUAL";

  async prepare(): Promise<FiscalProviderResult> {
    return {
      providerReference: null,
      status: "AGUARDANDO_CONTABILIDADE",
      message:
        "Dados preparados. Valide o tipo do documento com a contabilidade antes da emissão.",
    };
  }
}
