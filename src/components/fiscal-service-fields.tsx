"use client";

import { useState } from "react";
import type { Service } from "@/lib/types";

export function FiscalServiceFields({
  demo,
  initialServiceId,
  services,
}: {
  demo: boolean;
  initialServiceId?: string;
  services: Service[];
}) {
  const initial = services.find((service) => service.id === initialServiceId);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [amount, setAmount] = useState(String(initial?.total_final ?? initial?.sale_amount ?? ""));
  const [customerName, setCustomerName] = useState(initial?.clients?.name ?? "");

  function selectService(id: string) {
    setServiceId(id);
    const service = services.find((item) => item.id === id);
    setAmount(String(service?.total_final ?? service?.sale_amount ?? ""));
    setCustomerName(service?.clients?.name ?? "");
  }

  return (
    <>
      <label className="field">
        Serviço
        <select
          name="service_id"
          value={serviceId}
          required
          disabled={demo}
          onChange={(event) => selectService(event.target.value)}
        >
          <option value="">Selecione</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title} - {service.clients?.name ?? "Cliente"}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Valor
        <input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          required
          disabled={demo}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="field field-full">
        Tomador / cliente
        <input
          name="customer_name"
          value={customerName}
          required
          disabled={demo}
          onChange={(event) => setCustomerName(event.target.value)}
        />
      </label>
    </>
  );
}
