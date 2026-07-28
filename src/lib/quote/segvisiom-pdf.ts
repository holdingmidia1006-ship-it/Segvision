import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import {
  PDFDocument,
  type PDFImage,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
  type RGB,
} from "pdf-lib";
import type { CompanySettings, Service } from "../types";
import { formatCurrency } from "../utils";
import {
  calculateQuote,
  type QuoteLine,
  QuoteValidationError,
} from "./calculations";

const PAGE_WIDTH = 595.92;
const PAGE_HEIGHT = 842.88;
const MARGIN_X = 22;
const FOOTER_HEIGHT = 26;
const COLORS = {
  blue: rgb(0.055, 0.349, 0.855),
  blueDark: rgb(0.016, 0.102, 0.231),
  dark: rgb(0.025, 0.055, 0.102),
  line: rgb(0.851, 0.878, 0.918),
  text: rgb(0.105, 0.141, 0.188),
  muted: rgb(0.333, 0.392, 0.471),
  pale: rgb(0.953, 0.973, 1),
  white: rgb(1, 1, 1),
} as const;

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type TextOptions = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
  maxWidth?: number;
  lineHeight?: number;
};

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatDocument(value: string | null | undefined) {
  const number = digits(value);
  if (number.length === 11) {
    return `CPF: ${number.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4",
    )}`;
  }
  if (number.length === 14) {
    return `CNPJ: ${number.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    )}`;
  }
  return clean(value) ? `CPF/CNPJ: ${value}` : null;
}

function formatPhone(value: string | null | undefined) {
  const number = digits(value);
  if (number.length === 11) {
    return number.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (number.length === 10) {
    return number.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return clean(value);
}

function formatPostalCode(value: string | null | undefined) {
  const number = digits(value);
  return number.length === 8
    ? number.replace(/(\d{5})(\d{3})/, "$1-$2")
    : clean(value);
}

function formatDate(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(value);
}

function selectedClientAddress(service: Service) {
  const addresses = service.clients?.client_addresses ?? [];
  return (
    addresses.find((address) => address.id === service.client_address_id) ??
    addresses.find((address) => address.is_primary) ??
    addresses[0]
  );
}

function clientAddress(service: Service) {
  const address = selectedClientAddress(service);
  if (!address) return null;
  const firstLine = [
    clean(address.street),
    clean(address.number),
    clean(address.complement),
  ]
    .filter(Boolean)
    .join(", ");
  const secondLine = [
    clean(address.district),
    [clean(address.city), clean(address.state)].filter(Boolean).join("/"),
    formatPostalCode(address.postal_code)
      ? `CEP ${formatPostalCode(address.postal_code)}`
      : null,
  ]
    .filter(Boolean)
    .join(" - ");
  return [firstLine, secondLine].filter(Boolean).join(" | ");
}

function companyAddress(company: CompanySettings) {
  const firstLine = [
    clean(company.street),
    clean(company.number),
    clean(company.complement),
  ]
    .filter(Boolean)
    .join(", ");
  const secondLine = [
    clean(company.district),
    [clean(company.city), clean(company.state)].filter(Boolean).join("/"),
    formatPostalCode(company.postal_code)
      ? `CEP ${formatPostalCode(company.postal_code)}`
      : null,
  ]
    .filter(Boolean)
    .join(" - ");
  return [firstLine, secondLine].filter(Boolean);
}

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const pieces: string[] = [];
  let piece = "";
  for (const character of word) {
    const next = piece + character;
    if (piece && font.widthOfTextAtSize(next, size) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece = next;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const rawWord of words) {
    const wordParts =
      font.widthOfTextAtSize(rawWord, size) > maxWidth
        ? splitLongWord(rawWord, font, size, maxWidth)
        : [rawWord];
    for (const word of wordParts) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fonts: Fonts,
  options: TextOptions = {},
) {
  const size = options.size ?? 10;
  const font = options.font ?? fonts.regular;
  const color = options.color ?? COLORS.text;
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
  return y - lines.length * lineHeight;
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLORS.text,
) {
  page.drawText(text, {
    x: rightX - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function drawFooter(
  page: PDFPage,
  fonts: Fonts,
  company: CompanySettings,
  pageNumber?: string,
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: FOOTER_HEIGHT,
    color: COLORS.dark,
  });
  drawText(
    page,
    `${company.trade_name} - Segurança - Energia - Conectividade`,
    MARGIN_X,
    11,
    fonts,
    { size: 7.4, font: fonts.bold, color: COLORS.white },
  );
  const contact = [
    clean(company.instagram),
    formatPhone(company.phone),
    `${company.city} - ${company.state}`,
    pageNumber,
  ]
    .filter(Boolean)
    .join("  |  ");
  drawRightText(
    page,
    contact,
    PAGE_WIDTH - MARGIN_X,
    11,
    fonts.regular,
    7,
    rgb(0.72, 0.78, 0.86),
  );
}

function drawBanner(page: PDFPage, banner: PDFImage) {
  const height = PAGE_WIDTH / (banner.width / banner.height);
  page.drawImage(banner, {
    x: 0,
    y: PAGE_HEIGHT - height,
    width: PAGE_WIDTH,
    height,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - height - 3,
    width: PAGE_WIDTH,
    height: 3,
    color: COLORS.blue,
  });
  return PAGE_HEIGHT - height - 3;
}

function drawContinuationHeader(
  page: PDFPage,
  fonts: Fonts,
  service: Service,
  company: CompanySettings,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 62,
    width: PAGE_WIDTH,
    height: 62,
    color: COLORS.dark,
  });
  drawText(page, company.trade_name, MARGIN_X, PAGE_HEIGHT - 27, fonts, {
    size: 14,
    font: fonts.bold,
    color: COLORS.white,
  });
  drawText(page, "ORÇAMENTO - continuação", MARGIN_X, PAGE_HEIGHT - 45, fonts, {
    size: 8,
    color: rgb(0.7, 0.8, 0.94),
  });
  drawRightText(
    page,
    `Nº ${service.quote_number}`,
    PAGE_WIDTH - MARGIN_X,
    PAGE_HEIGHT - 34,
    fonts.bold,
    9,
    COLORS.white,
  );
}

function drawTitle(
  page: PDFPage,
  fonts: Fonts,
  service: Service,
  company: CompanySettings,
  y: number,
) {
  drawText(page, "ORÇAMENTO", MARGIN_X, y, fonts, {
    size: 18,
    font: fonts.bold,
  });
  const createdAt = service.created_at ? new Date(service.created_at) : new Date();
  const validUntil = service.valid_until
    ? new Date(`${service.valid_until}T12:00:00`)
    : new Date(
        createdAt.getTime() +
          company.default_validity_days * 24 * 60 * 60 * 1000,
      );
  drawRightText(
    page,
    `Nº ${service.quote_number ?? service.id.slice(0, 8).toUpperCase()}`,
    PAGE_WIDTH - MARGIN_X,
    y + 25,
    fonts.bold,
    8.6,
  );
  drawRightText(
    page,
    `Versão ${service.quote_version ?? 1}`,
    PAGE_WIDTH - MARGIN_X,
    y + 12,
    fonts.bold,
    8.6,
  );
  drawRightText(
    page,
    `Data: ${formatDate(createdAt)}`,
    PAGE_WIDTH - MARGIN_X,
    y - 1,
    fonts.bold,
    8.6,
  );
  drawRightText(
    page,
    `Validade: ${formatDate(validUntil)}`,
    PAGE_WIDTH - MARGIN_X,
    y - 14,
    fonts.bold,
    8.6,
  );
  page.drawLine({
    start: { x: MARGIN_X, y: y - 20 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: y - 20 },
    thickness: 1.4,
    color: COLORS.blue,
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
) {
  const height = 98;
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: rgb(0.984, 0.988, 0.996),
    borderColor: COLORS.line,
    borderWidth: 0.8,
  });
  drawText(page, title.toUpperCase(), x + 11, y - 17, fonts, {
    size: 7.5,
    font: fonts.bold,
    color: COLORS.blue,
  });
  let cursorY = y - 34;
  rows.filter(Boolean).forEach((row, index) => {
    cursorY = drawText(page, row, x + 11, cursorY, fonts, {
      size: index === 0 ? 9 : 7.8,
      font: index === 0 ? fonts.bold : fonts.regular,
      color: index === 0 ? COLORS.text : COLORS.muted,
      maxWidth: width - 22,
      lineHeight: 9.8,
    });
    cursorY -= 2;
  });
}

function drawTableHeader(page: PDFPage, fonts: Fonts, startY: number) {
  const width = PAGE_WIDTH - MARGIN_X * 2;
  page.drawRectangle({
    x: MARGIN_X,
    y: startY - 24,
    width,
    height: 24,
    color: COLORS.dark,
  });
  drawText(page, "QTD.", 30, startY - 16, fonts, {
    size: 7.5,
    font: fonts.bold,
    color: COLORS.white,
  });
  drawText(page, "UN.", 68, startY - 16, fonts, {
    size: 7.5,
    font: fonts.bold,
    color: COLORS.white,
  });
  drawText(page, "DESCRIÇÃO", 105, startY - 16, fonts, {
    size: 7.5,
    font: fonts.bold,
    color: COLORS.white,
  });
  drawRightText(
    page,
    "VALOR UNITÁRIO",
    490,
    startY - 16,
    fonts.bold,
    7.5,
    COLORS.white,
  );
  drawRightText(
    page,
    "SUBTOTAL",
    PAGE_WIDTH - 30,
    startY - 16,
    fonts.bold,
    7.5,
    COLORS.white,
  );
  return startY - 24;
}

function quoteLineHeight(line: QuoteLine, fonts: Fonts) {
  return Math.max(
    27,
    14 + wrapText(line.description, fonts.bold, 8.2, 235).length * 9.5,
  );
}

function drawQuoteLine(
  page: PDFPage,
  fonts: Fonts,
  line: QuoteLine,
  y: number,
  index: number,
) {
  const rowHeight = quoteLineHeight(line, fonts);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - rowHeight,
    width: PAGE_WIDTH - MARGIN_X * 2,
    height: rowHeight,
    color: index % 2 ? rgb(0.96, 0.973, 0.992) : COLORS.white,
  });
  page.drawLine({
    start: { x: MARGIN_X, y: y - rowHeight },
    end: { x: PAGE_WIDTH - MARGIN_X, y: y - rowHeight },
    thickness: 0.6,
    color: COLORS.line,
  });
  drawRightText(
    page,
    formatQuantity(line.quantity),
    58,
    y - 18,
    fonts.regular,
    8.2,
    COLORS.muted,
  );
  drawText(page, line.unit, 68, y - 18, fonts, {
    size: 7.8,
    color: COLORS.muted,
    maxWidth: 32,
  });
  wrapText(line.description, fonts.bold, 8.2, 235).forEach((text, lineIndex) => {
    drawText(page, text, 105, y - 18 - lineIndex * 9.5, fonts, {
      size: 8.2,
      font: fonts.bold,
    });
  });
  drawRightText(
    page,
    formatCurrency(line.unitPrice),
    490,
    y - 18,
    fonts.regular,
    8.2,
  );
  drawRightText(
    page,
    formatCurrency(line.subtotal),
    PAGE_WIDTH - 30,
    y - 18,
    fonts.bold,
    8.2,
  );
  return y - rowHeight;
}

function drawTotals(
  page: PDFPage,
  fonts: Fonts,
  totals: ReturnType<typeof calculateQuote>,
  y: number,
) {
  const x = PAGE_WIDTH - 235;
  const right = PAGE_WIDTH - 30;
  drawText(page, "Subtotal comercial", x, y, fonts, {
    size: 8.5,
    color: COLORS.muted,
  });
  drawRightText(
    page,
    formatCurrency(totals.subtotalCommercial),
    right,
    y,
    fonts.bold,
    8.5,
  );
  let cursor = y - 18;
  if (totals.discount > 0) {
    drawText(page, "Desconto", x, cursor, fonts, {
      size: 8.5,
      color: COLORS.muted,
    });
    drawRightText(
      page,
      `- ${formatCurrency(totals.discount)}`,
      right,
      cursor,
      fonts.bold,
      8.5,
    );
    cursor -= 18;
  }
  if (totals.additional > 0) {
    drawText(page, "Acréscimo", x, cursor, fonts, {
      size: 8.5,
      color: COLORS.muted,
    });
    drawRightText(
      page,
      `+ ${formatCurrency(totals.additional)}`,
      right,
      cursor,
      fonts.bold,
      8.5,
    );
    cursor -= 18;
  }
  page.drawRectangle({
    x: x - 8,
    y: cursor - 38,
    width: 213,
    height: 36,
    color: COLORS.blueDark,
  });
  drawText(page, "TOTAL", x + 3, cursor - 24, fonts, {
    size: 10,
    color: COLORS.white,
  });
  drawRightText(
    page,
    formatCurrency(totals.totalFinal),
    right,
    cursor - 26,
    fonts.bold,
    15,
    COLORS.white,
  );
  return cursor - 54;
}

function drawTerms(
  page: PDFPage,
  fonts: Fonts,
  service: Service,
  company: CompanySettings,
  y: number,
) {
  const terms = [
    clean(service.payment_terms) ?? clean(company.default_payment_terms),
    clean(service.execution_deadline) ??
      clean(company.default_execution_deadline),
    clean(service.warranty_terms) ?? clean(company.default_warranty_terms),
    clean(service.customer_notes),
  ].filter(Boolean) as string[];
  const lineCount = terms.reduce(
    (sum, term) => sum + wrapText(term, fonts.regular, 8, 500).length,
    0,
  );
  const height = Math.max(70, 34 + lineCount * 11);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - height,
    width: PAGE_WIDTH - MARGIN_X * 2,
    height,
    color: COLORS.pale,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: y - height,
    width: 2,
    height,
    color: COLORS.blue,
  });
  drawText(page, "CONDIÇÕES", 34, y - 17, fonts, {
    size: 8.5,
    font: fonts.bold,
    color: COLORS.blueDark,
  });
  let cursor = y - 34;
  terms.forEach((term) => {
    const lines = wrapText(term, fonts.regular, 8, 500);
    lines.forEach((line, index) => {
      drawText(page, `${index === 0 ? "• " : "  "}${line}`, 34, cursor, fonts, {
        size: 8,
      });
      cursor -= 11;
    });
  });
  return y - height;
}

function drawSignature(
  page: PDFPage,
  fonts: Fonts,
  company: CompanySettings,
  y: number,
) {
  page.drawLine({
    start: { x: 193, y },
    end: { x: 402, y },
    thickness: 0.8,
    color: COLORS.text,
  });
  const name = clean(company.responsible_name) ?? company.legal_name;
  const role = clean(company.responsible_role);
  const nameWidth = fonts.bold.widthOfTextAtSize(name, 9.2);
  drawText(page, name, (PAGE_WIDTH - nameWidth) / 2, y - 14, fonts, {
    size: 9.2,
    font: fonts.bold,
  });
  if (role) {
    const roleWidth = fonts.regular.widthOfTextAtSize(role, 8);
    drawText(page, role, (PAGE_WIDTH - roleWidth) / 2, y - 27, fonts, {
      size: 8,
      color: COLORS.muted,
    });
  }
  const date = `${company.city}, ${new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())}.`;
  const dateWidth = fonts.regular.widthOfTextAtSize(date, 8);
  drawText(page, date, (PAGE_WIDTH - dateWidth) / 2, y - 44, fonts, {
    size: 8,
    color: COLORS.muted,
  });
}

async function loadBanner(company: CompanySettings) {
  const publicRoot = resolve(process.cwd(), "public");
  const configuredPath = resolve(
    publicRoot,
    company.banner_path.replace(/^[/\\]+/, ""),
  );
  const safePath = configuredPath.startsWith(`${publicRoot}${sep}`)
    ? configuredPath
    : join(publicRoot, "segvisiom", "banner-header-segvisiom.png");
  return readFile(safePath);
}

function validateQuoteData(service: Service, company: CompanySettings) {
  const missing: string[] = [];
  if (!clean(service.clients?.name)) missing.push("nome do cliente");
  if (!clean(service.clients?.document)) missing.push("CPF/CNPJ do cliente");
  if (!formatPhone(service.clients?.phone)) missing.push("telefone do cliente");
  if (!clean(service.clients?.email)) missing.push("e-mail do cliente");
  if (!selectedClientAddress(service)) missing.push("endereço do cliente");
  if (!clean(company.legal_name)) missing.push("razão social do prestador");
  if (!clean(company.document)) missing.push("CNPJ do prestador");
  if (!companyAddress(company).length) missing.push("endereço do prestador");
  if (!formatPhone(company.phone)) missing.push("telefone do prestador");
  if (!clean(company.responsible_name)) missing.push("responsável do prestador");
  if (missing.length) {
    throw new QuoteValidationError(
      `Complete os seguintes dados antes de gerar o PDF: ${missing.join(", ")}.`,
    );
  }
}

export async function renderSegvisionQuotePdf(
  service: Service,
  company: CompanySettings,
) {
  validateQuoteData(service, company);
  const client = service.clients!;
  const totals = calculateQuote(service);
  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const banner = await pdfDoc.embedPng(await loadBanner(company));
  const pages: PDFPage[] = [];
  const addPage = (continuation = false) => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    if (continuation) drawContinuationHeader(page, fonts, service, company);
    return page;
  };

  let page = addPage();
  const bannerBottom = drawBanner(page, banner);
  drawTitle(page, fonts, service, company, bannerBottom - 40);

  const cardY = bannerBottom - 88;
  const cardWidth = (PAGE_WIDTH - 55) / 2;
  drawCard(
    page,
    fonts,
    "Prestador",
    [
      company.legal_name,
      formatDocument(company.document),
      ...companyAddress(company),
      formatPhone(company.phone)
        ? `Contato: ${formatPhone(company.phone)}`
        : "",
      clean(company.email) ? `E-mail: ${company.email}` : "",
    ].filter(Boolean) as string[],
    MARGIN_X,
    cardY,
    cardWidth,
  );
  drawCard(
    page,
    fonts,
    "Cliente",
    [
      client.name,
      formatDocument(client.document),
      clientAddress(service) ? `Endereço: ${clientAddress(service)}` : "",
      formatPhone(client.phone)
        ? `Contato: ${formatPhone(client.phone)}`
        : "",
      clean(client.email) ? `E-mail: ${client.email}` : "",
    ].filter(Boolean) as string[],
    MARGIN_X + cardWidth + 11,
    cardY,
    cardWidth,
  );

  let y = drawTableHeader(page, fonts, cardY - 116);
  totals.lines.forEach((line, index) => {
    const rowHeight = quoteLineHeight(line, fonts);
    if (y - rowHeight < FOOTER_HEIGHT + 28) {
      page = addPage(true);
      y = drawTableHeader(page, fonts, PAGE_HEIGHT - 84);
    }
    y = drawQuoteLine(page, fonts, line, y, index);
  });

  if (y < 320) {
    page = addPage(true);
    y = PAGE_HEIGHT - 92;
  }
  y = drawTotals(page, fonts, totals, y - 18);
  y = drawTerms(page, fonts, service, company, y - 12);
  if (y < 98) {
    page = addPage(true);
    y = PAGE_HEIGHT - 130;
  }
  drawSignature(page, fonts, company, y - 34);

  pages.forEach((currentPage, index) => {
    drawFooter(
      currentPage,
      fonts,
      company,
      `Página ${index + 1} de ${pages.length}`,
    );
  });

  pdfDoc.setTitle(
    `Orçamento ${service.quote_number ?? service.id} - ${client.name}`,
  );
  pdfDoc.setAuthor(company.trade_name);
  pdfDoc.setSubject(service.title);
  return Buffer.from(await pdfDoc.save());
}
