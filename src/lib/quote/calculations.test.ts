import assert from "node:assert/strict";
import test from "node:test";
import type { Service } from "../types";
import { calculateQuote, QuoteValidationError } from "./calculations.ts";

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Orçamento de teste",
    client_id: "00000000-0000-0000-0000-000000000002",
    client_address_id: null,
    service_type_id: null,
    description: null,
    customer_notes: null,
    internal_notes: null,
    status: "ORCAMENTO",
    sale_amount: 1_500,
    estimated_cost_amount: 0,
    estimated_start_at: null,
    estimated_end_at: null,
    actual_start_at: null,
    actual_end_at: null,
    warranty_until: null,
    created_at: "2026-07-28T12:00:00.000Z",
    updated_at: "2026-07-28T12:00:00.000Z",
    discount_amount: 100,
    additional_amount: 50,
    service_items: [
      {
        id: "item-1",
        service_id: "00000000-0000-0000-0000-000000000001",
        description: "Câmera",
        unit: "un",
        quantity: 2,
        unit_price: 300,
        unit_cost: 0,
        total_price: 600,
      },
    ],
    service_costs: [
      {
        id: "cost-1",
        service_id: "00000000-0000-0000-0000-000000000001",
        employee_id: null,
        category: "OUTROS",
        description: "Frete",
        amount: 100,
        cost_date: "2026-07-28",
        visible_to_customer: true,
        created_at: "2026-07-28T12:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

test("reconcilia materiais, repasses, mão de obra e total final", () => {
  const result = calculateQuote(service());
  assert.equal(result.materials, 600);
  assert.equal(result.customerCosts, 100);
  assert.equal(result.labor, 800);
  assert.equal(result.subtotalCommercial, 1_500);
  assert.equal(result.totalFinal, 1_450);
  assert.equal(
    result.lines.reduce((sum, line) => sum + line.subtotal, 0),
    result.subtotalCommercial,
  );
});

test("não expõe custos internos no orçamento", () => {
  const input = service();
  input.service_costs?.push({
    id: "cost-internal",
    service_id: input.id,
    employee_id: null,
    category: "COMBUSTIVEL",
    description: "Combustível interno",
    amount: 500,
    cost_date: "2026-07-28",
    visible_to_customer: false,
    created_at: "2026-07-28T12:00:00.000Z",
  });
  const result = calculateQuote(input);
  assert.equal(result.customerCosts, 100);
  assert.equal(
    result.lines.some((line) => line.description === "Combustível interno"),
    false,
  );
});

test("bloqueia geração quando materiais e repasses superam a venda", () => {
  assert.throws(
    () => calculateQuote(service({ sale_amount: 650 })),
    QuoteValidationError,
  );
});

test("bloqueia orçamento sem itens", () => {
  assert.throws(
    () => calculateQuote(service({ service_items: [] })),
    QuoteValidationError,
  );
});
