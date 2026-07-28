import type { Service } from "../types";

export class QuoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteValidationError";
  }
}

export type QuoteLine = {
  key: string;
  quantity: number;
  unit: string;
  description: string;
  unitPrice: number;
  subtotal: number;
  kind: "material" | "labor" | "additional-cost";
};

function toCents(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    throw new QuoteValidationError("O orçamento contém um valor inválido.");
  }
  return Math.round(number * 100);
}

function fromCents(value: number) {
  return value / 100;
}

export function calculateQuote(service: Service) {
  const materialLines: QuoteLine[] = (service.service_items ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => {
      const quantity = Number(item.quantity);
      const unitPriceCents = toCents(item.unit_price);
      const subtotalCents = Math.round(quantity * unitPriceCents);
      return {
        key: item.id,
        quantity,
        unit: item.unit,
        description: item.description,
        unitPrice: fromCents(unitPriceCents),
        subtotal: fromCents(subtotalCents),
        kind: "material" as const,
      };
    });

  if (!materialLines.length) {
    throw new QuoteValidationError(
      "Adicione ao menos um item antes de gerar o orçamento.",
    );
  }

  const customerCosts: QuoteLine[] = (service.service_costs ?? [])
    .filter((cost) => cost.visible_to_customer)
    .map((cost) => {
      const amountCents = toCents(cost.amount);
      return {
        key: cost.id,
        quantity: 1,
        unit: "serviço",
        description: cost.description?.trim() || "Custo adicional",
        unitPrice: fromCents(amountCents),
        subtotal: fromCents(amountCents),
        kind: "additional-cost" as const,
      };
    });

  const materialsCents = materialLines.reduce(
    (sum, line) => sum + toCents(line.subtotal),
    0,
  );
  const customerCostsCents = customerCosts.reduce(
    (sum, line) => sum + toCents(line.subtotal),
    0,
  );
  const saleCents = toCents(service.sale_amount);
  const laborCents = saleCents - materialsCents - customerCostsCents;

  if (laborCents < 0) {
    throw new QuoteValidationError(
      "O valor de venda é menor que a soma dos materiais e custos repassados. Ajuste o valor de venda antes de gerar o PDF.",
    );
  }

  const laborLine: QuoteLine[] =
    laborCents > 0
      ? [
          {
            key: "labor",
            quantity: 1,
            unit: "serviço",
            description:
              service.service_line_label?.trim() || "Mão de obra e Serviços",
            unitPrice: fromCents(laborCents),
            subtotal: fromCents(laborCents),
            kind: "labor",
          },
        ]
      : [];

  const discountCents = toCents(service.discount_amount);
  const additionalCents = toCents(service.additional_amount);
  const totalFinalCents = saleCents + additionalCents - discountCents;
  if (totalFinalCents < 0) {
    throw new QuoteValidationError(
      "O desconto não pode ser maior que o valor de venda somado ao acréscimo.",
    );
  }

  return {
    lines: [...materialLines, ...laborLine, ...customerCosts],
    materials: fromCents(materialsCents),
    customerCosts: fromCents(customerCostsCents),
    labor: fromCents(laborCents),
    subtotalCommercial: fromCents(saleCents),
    discount: fromCents(discountCents),
    additional: fromCents(additionalCents),
    totalFinal: fromCents(totalFinalCents),
  };
}
