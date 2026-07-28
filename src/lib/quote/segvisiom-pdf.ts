import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
  type RGB,
} from "pdf-lib";
import type { Service, ServiceItem } from "../types";
import { formatCurrency } from "../utils";

const BRAND = {
  name: "SEG VISIOM",
  tagline: "Segurança - Energia - Conectividade",
  instagram: "@segvisiom",
  whatsapp: "(62) 98443-4663",
  city: "Goiânia - GO",
  provider: {
    name: "Glaucione Segurado de Miranda Vasconcelos",
    document: "CNPJ 27.491.886/0001-70",
    address: "R. Valença, S/N, Qd.111 Lt.16 - Set. Leste Universitário",
    city: "Goiânia - GO - CEP 74615-280",
  },
  responsible: {
    name: "Leonardo Cândido Vasconcelos",
    role: "Técnico em Telecomunicação e Elétrica",
  },
  colors: {
    blue: rgb(0.114, 0.427, 0.941),
    blueLight: rgb(0.298, 0.608, 1),
    blueDark: rgb(0.043, 0.133, 0.302),
    dark: rgb(0.043, 0.067, 0.114),
    line: rgb(0.851, 0.878, 0.918),
    text: rgb(0.105, 0.141, 0.188),
    muted: rgb(0.333, 0.392, 0.471),
    pale: rgb(0.953, 0.973, 1),
    white: rgb(1, 1, 1),
  },
} as const;

const PAGE_WIDTH = 595.92;
const PAGE_HEIGHT = 842.88;
const MARGIN_X = 22;
const BANNER_HEIGHT = 149;

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type DrawTextOptions = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
  maxWidth?: number;
  lineHeight?: number;
};

function money(value: number | string | null | undefined) {
  return formatCurrency(Number(value ?? 0));
}

function quoteNumber(service: Service) {
  const year = new Date(service.created_at ?? Date.now()).getFullYear();
  return `${service.id.slice(0, 4).toUpperCase()}/${year}`;
}

function todayBR() {
  return new Intl.DateTimeFormat("pt-BR").format(new Date());
}

function extendedDateBR() {
  return `Goiânia, ${new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())}.`;
}

function clientAddress(service: Service) {
  const addresses = service.clients?.client_addresses ?? [];
  const selected =
    addresses.find((address) => address.id === service.client_address_id) ??
    addresses.find((address) => address.is_primary) ??
    addresses[0];

  if (!selected) return "-";

  return [
    selected.street,
    selected.number,
    selected.complement,
    selected.district,
    `${selected.city}/${selected.state}`,
    selected.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function quoteItems(service: Service): ServiceItem[] {
  if (service.service_items?.length) return service.service_items;
  return [
    {
      id: "service-description",
      service_id: service.id,
      description: service.description || service.title,
      unit: "servico",
      quantity: 1,
      unit_price: Number(service.sale_amount),
      unit_cost: 0,
      total_price: Number(service.sale_amount),
    },
  ];
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = String(text || "-").split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fonts: Fonts,
  options: DrawTextOptions = {},
) {
  const size = options.size ?? 10;
  const font = options.font ?? fonts.regular;
  const color = options.color ?? BRAND.colors.text;
  const lineHeight = options.lineHeight ?? size * 1.35;
  const lines = options.maxWidth
    ? wrapText(text, font, size, options.maxWidth)
    : [text];

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });

  return y - (lines.length - 1) * lineHeight;
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BRAND.colors.text,
) {
  page.drawText(text, {
    x: rightX - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function drawCard(
  page: PDFPage,
  fonts: Fonts,
  title: string,
  rows: string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: rgb(0.984, 0.988, 0.996),
    borderColor: BRAND.colors.line,
    borderWidth: 0.8,
  });
  drawText(page, title.toUpperCase(), x + 11, y - 18, fonts, {
    size: 7.5,
    font: fonts.bold,
    color: BRAND.colors.blue,
  });

  let cursorY = y - 36;
  rows.forEach((row, index) => {
    cursorY = drawText(page, row, x + 11, cursorY, fonts, {
      size: index === 0 ? 9.5 : 8.8,
      font: index === 0 ? fonts.bold : fonts.regular,
      color: index === 0 ? BRAND.colors.text : BRAND.colors.muted,
      maxWidth: width - 22,
      lineHeight: 12,
    });
    cursorY -= 10;
  });
}

function drawHeader(page: PDFPage, banner: Uint8Array, pdfDoc: PDFDocument) {
  return pdfDoc.embedPng(banner).then((image) => {
    page.drawImage(image, {
      x: 0,
      y: PAGE_HEIGHT - BANNER_HEIGHT,
      width: PAGE_WIDTH,
      height: BANNER_HEIGHT,
    });
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - BANNER_HEIGHT - 3,
      width: PAGE_WIDTH,
      height: 3,
      color: BRAND.colors.blue,
    });
  });
}

function drawFooter(page: PDFPage, fonts: Fonts) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 26,
    color: BRAND.colors.dark,
  });
  drawText(page, "SEG VISIOM - Segurança - Energia - Conectividade", 22, 11, fonts, {
    size: 7.8,
    font: fonts.bold,
    color: BRAND.colors.white,
  });
  drawRightText(
    page,
    `${BRAND.instagram} - ${BRAND.whatsapp} - ${BRAND.city}`,
    PAGE_WIDTH - 22,
    11,
    fonts.regular,
    7.4,
    rgb(0.72, 0.78, 0.86),
  );
}

function drawDocumentTitle(page: PDFPage, fonts: Fonts, service: Service) {
  const y = 636;
  drawText(page, "ORÇA", 22, y, fonts, {
    size: 18,
    font: fonts.bold,
    color: BRAND.colors.text,
  });
  drawText(page, "MENTO", 22 + fonts.bold.widthOfTextAtSize("ORÇA", 18), y, fonts, {
    size: 18,
    font: fonts.bold,
    color: BRAND.colors.blue,
  });

  drawRightText(page, `No ${quoteNumber(service)}`, PAGE_WIDTH - 22, y + 26, fonts.bold, 8.6);
  drawRightText(page, `Data: ${todayBR()}`, PAGE_WIDTH - 22, y + 12, fonts.bold, 8.6);
  drawRightText(page, "Validade: 10 dias", PAGE_WIDTH - 22, y - 2, fonts.bold, 8.6);

  page.drawLine({
    start: { x: 22, y: y - 14 },
    end: { x: PAGE_WIDTH - 22, y: y - 14 },
    thickness: 1.4,
    color: BRAND.colors.blue,
  });
}

function drawItemsTable(
  page: PDFPage,
  fonts: Fonts,
  items: ServiceItem[],
  startY: number,
) {
  const x = MARGIN_X;
  const width = PAGE_WIDTH - MARGIN_X * 2;
  const columns = {
    qty: x + 24,
    desc: x + 83,
    unit: x + 392,
    total: x + width - 8,
  };

  page.drawRectangle({
    x,
    y: startY - 24,
    width,
    height: 24,
    color: BRAND.colors.dark,
  });
  drawText(page, "QTD.", columns.qty, startY - 16, fonts, {
    size: 8,
    font: fonts.bold,
    color: BRAND.colors.white,
  });
  drawText(page, "DESCRIÇÃO", columns.desc, startY - 16, fonts, {
    size: 8,
    font: fonts.bold,
    color: BRAND.colors.white,
  });
  drawRightText(page, "VALOR UNITÁRIO", columns.unit + 58, startY - 16, fonts.bold, 8, BRAND.colors.white);
  drawRightText(page, "SUBTOTAL", columns.total, startY - 16, fonts.bold, 8, BRAND.colors.white);

  let y = startY - 24;
  items.forEach((item, index) => {
    const lines = wrapText(item.description, fonts.bold, 8.6, 230);
    const rowHeight = Math.max(25, 13 + lines.length * 10);
    const fill = index % 2 ? rgb(0.96, 0.973, 0.992) : BRAND.colors.white;
    page.drawRectangle({ x, y: y - rowHeight, width, height: rowHeight, color: fill });
    page.drawLine({
      start: { x, y: y - rowHeight },
      end: { x: x + width, y: y - rowHeight },
      thickness: 0.6,
      color: BRAND.colors.line,
    });

    drawRightText(page, String(item.quantity), columns.qty + 14, y - 17, fonts.regular, 8.6, BRAND.colors.muted);
    lines.forEach((line, lineIndex) => {
      drawText(page, line, columns.desc, y - 17 - lineIndex * 10, fonts, {
        size: 8.6,
        font: fonts.bold,
      });
    });
    drawRightText(page, money(item.unit_price), columns.unit + 58, y - 17, fonts.regular, 8.6);
    drawRightText(page, money(item.total_price), columns.total, y - 17, fonts.regular, 8.6);
    y -= rowHeight;
  });

  return y;
}

function drawTotals(
  page: PDFPage,
  fonts: Fonts,
  subtotal: number,
  discount: number,
  total: number,
  y: number,
) {
  const boxX = PAGE_WIDTH - 225;
  drawText(page, "Subtotal", boxX, y, fonts, { size: 8.8, color: BRAND.colors.muted });
  drawRightText(page, money(subtotal), PAGE_WIDTH - 32, y, fonts.bold, 8.8);
  drawText(page, "Desconto", boxX, y - 20, fonts, { size: 8.8, color: BRAND.colors.muted });
  drawRightText(page, money(discount), PAGE_WIDTH - 32, y - 20, fonts.bold, 8.8);

  page.drawRectangle({
    x: boxX - 8,
    y: y - 68,
    width: 206,
    height: 36,
    color: BRAND.colors.blueDark,
  });
  drawText(page, "TOTAL", boxX + 3, y - 54, fonts, {
    size: 10,
    color: BRAND.colors.white,
  });
  drawRightText(page, money(total), PAGE_WIDTH - 32, y - 56, fonts.bold, 15, BRAND.colors.white);
}

function drawTerms(page: PDFPage, fonts: Fonts, service: Service, y: number) {
  page.drawRectangle({
    x: 22,
    y: y - 78,
    width: PAGE_WIDTH - 44,
    height: 78,
    color: rgb(0.945, 0.965, 0.992),
  });
  page.drawRectangle({ x: 22, y: y - 78, width: 2, height: 78, color: BRAND.colors.blue });
  drawText(page, "CONDIÇÕES", 34, y - 17, fonts, {
    size: 8.5,
    font: fonts.bold,
    color: BRAND.colors.blueDark,
  });

  const terms = [
    "Proposta válida por 10 dias.",
    "Formas de pagamento a combinar.",
    "Garantia dos serviços conforme legislação vigente.",
    service.customer_notes &&
    !service.customer_notes
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes("valid")
      ? service.customer_notes
      : null,
  ].filter(Boolean) as string[];

  let cursorY = y - 34;
  terms.forEach((term) => {
    drawText(page, `> ${term}`, 34, cursorY, fonts, {
      size: 8.2,
      color: BRAND.colors.text,
      maxWidth: PAGE_WIDTH - 80,
    });
    cursorY -= 14;
  });
}

function drawSignature(page: PDFPage, fonts: Fonts, y: number) {
  page.drawLine({
    start: { x: 193, y },
    end: { x: 402, y },
    thickness: 0.8,
    color: BRAND.colors.text,
  });
  drawText(page, BRAND.responsible.name, 230, y - 14, fonts, {
    size: 9.6,
    font: fonts.bold,
  });
  drawText(page, BRAND.responsible.role, 231, y - 26, fonts, {
    size: 8.1,
    color: BRAND.colors.muted,
  });
  drawText(page, extendedDateBR(), 247, y - 45, fonts, {
    size: 8,
    color: BRAND.colors.muted,
  });
}

export async function renderSegvisionQuotePdf(service: Service) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const banner = await readFile(
    join(process.cwd(), "public", "segvisiom", "bannerheadersegvisiom.png"),
  );

  await drawHeader(page, banner, pdfDoc);
  drawFooter(page, fonts);
  drawDocumentTitle(page, fonts, service);

  const cardY = 588;
  const cardWidth = (PAGE_WIDTH - 55) / 2;
  drawCard(
    page,
    fonts,
    "Prestador",
    [
      BRAND.provider.name,
      BRAND.provider.document,
      BRAND.provider.address,
      BRAND.provider.city,
    ],
    22,
    cardY,
    cardWidth,
    86,
  );
  drawCard(
    page,
    fonts,
    "Cliente",
    [
      service.clients?.name ?? "Cliente não informado",
      `CPF/CNPJ: ${service.clients?.document ?? "-"}`,
      `Endereço: ${clientAddress(service)}`,
      `Contato: ${service.clients?.phone ?? "-"}`,
    ],
    22 + cardWidth + 11,
    cardY,
    cardWidth,
    86,
  );

  const items = quoteItems(service);
  const subtotal = items.reduce((sum, item) => sum + Number(item.total_price), 0);
  const total = Number(service.sale_amount);
  const discount = Math.max(0, subtotal - total);
  const tableBottom = drawItemsTable(page, fonts, items, 468);

  drawTotals(page, fonts, subtotal, discount, total, tableBottom - 24);
  drawTerms(page, fonts, service, tableBottom - 112);
  drawSignature(page, fonts, tableBottom - 228);

  return Buffer.from(await pdfDoc.save());
}
