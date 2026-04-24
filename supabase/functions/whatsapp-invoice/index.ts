import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface RequestBody {
  invoiceId: string;
  docNum: number;
  customerName: string;
  customerCode: string;
  recipientPhone: string;
  welcomeMessage: string;
  sapDocEntry?: string | null;
  total?: number;
}

// SAP B1 connection
async function connectToSAP(): Promise<{ sessionId: string; cookies: string; baseUrl: string } | null> {
  let sapUrl = Deno.env.get("SAP_B1_SERVICE_LAYER_URL");
  const sapUsername = Deno.env.get("SAP_B1_USERNAME");
  const sapPassword = Deno.env.get("SAP_B1_PASSWORD");
  const sapCompanyDb = Deno.env.get("SAP_B1_COMPANY_DB");

  if (!sapUrl || !sapUsername || !sapPassword || !sapCompanyDb) {
    console.warn("SAP B1 credentials not configured");
    return null;
  }

  sapUrl = sapUrl.replace(/\/+$/, '');
  if (!sapUrl.endsWith('/b1s/v1')) {
    sapUrl = sapUrl + '/b1s/v1';
  }

  try {
    const loginResponse = await fetch(`${sapUrl}/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserName: sapUsername,
        Password: sapPassword,
        CompanyDB: sapCompanyDb,
      }),
    });

    if (!loginResponse.ok) {
      console.error("SAP login failed:", await loginResponse.text());
      return null;
    }

    const cookies = loginResponse.headers.get("set-cookie") || "";
    const loginData = await loginResponse.json();
    return { sessionId: loginData.SessionId, cookies, baseUrl: sapUrl };
  } catch (error) {
    console.error("SAP connection error:", error);
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Professional PDF color constants
const NAVY = rgb(0.102, 0.212, 0.365);
const GOLD = rgb(0.722, 0.525, 0.043);
const WHITE = rgb(1, 1, 1);
const LIGHT_BG = rgb(0.933, 0.933, 0.933);
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const BORDER_COLOR = rgb(0.75, 0.75, 0.75);

interface InvoicePDFData {
  docNum: number;
  docDate: string;
  docTime: string;
  customerName: string;
  customerCode: string;
  customerPhone: string;
  customerVat: string;
  customerCrn: string;
  branchName: string;
  branchMobile: string;
  branchAddress: string;
  lines: Array<{
    line_num: number;
    item_code: string;
    description: string;
    quantity: number;
    unit_price: number;
    unit: string;
    discount_percent: number;
    line_total: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  qrData: string;
}

function drawLine(page: any, x1: number, y1: number, x2: number, y2: number, color = BORDER_COLOR, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function toWinAnsiSafeText(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  const normalized = raw.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ");
  const compact = normalized.replace(/\s+/g, " ").trim();
  return compact || "-";
}

function drawTextRight(page: any, text: string, x: number, y: number, font: any, size: number, color = BLACK) {
  const safeText = toWinAnsiSafeText(text);
  const w = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: x - w, y, size, font, color });
}

function drawTextCenter(page: any, text: string, centerX: number, y: number, font: any, size: number, color = BLACK) {
  const safeText = toWinAnsiSafeText(text);
  const w = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: centerX - w / 2, y, size, font, color });
}

async function generateProfessionalPDF(data: InvoicePDFData): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const M = 30; // margin
  let y = 841.89;

  // pdf-lib standard fonts are WinAnsi-only; sanitize any non-Latin text to prevent runtime crash
  const rawDrawText = page.drawText.bind(page);
  page.drawText = ((text: string, options: any) => rawDrawText(toWinAnsiSafeText(text), options)) as any;

  // === 1. NAVY HEADER ===
  const headerH = 85;
  page.drawRectangle({ x: 0, y: y - headerH, width: W, height: headerH, color: NAVY });

  // Try to embed logo
  try {
    const logoRes = await fetch("https://alrajhi-smart-suite.lovable.app/images/alrajhi-logo.png");
    if (logoRes.ok) {
      const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch {
        // If PNG embedding fails, try as JPG
        try {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        } catch (e2) {
          console.warn("Logo embed failed for both PNG and JPG:", e2);
        }
      }
      if (logoImage) {
        const logoDims = logoImage.scale(1);
        const logoH = 50;
        const logoW = (logoDims.width / logoDims.height) * logoH;
        page.drawImage(logoImage, { x: M, y: y - 68, width: logoW, height: logoH });
      }
    } else {
      console.warn("Logo fetch failed:", logoRes.status);
    }
  } catch (e) { console.warn("Logo embed skipped:", e); }

  // Company name (English)
  page.drawText("Al-Rajhi Building & Constructions Co.", { x: 95, y: y - 30, size: 14, font: fontBold, color: WHITE });
  page.drawText("Trading - Manufacturing - Contracting", { x: 95, y: y - 44, size: 9, font, color: rgb(0.8, 0.8, 0.8) });

  // CR & VAT
  page.drawText("C.R 1010089808", { x: M, y: y - 78, size: 8, font, color: rgb(0.65, 0.65, 0.65) });
  page.drawText("VAT No.: 300050645300003", { x: 180, y: y - 78, size: 8, font, color: rgb(0.65, 0.65, 0.65) });
  y -= headerH;

  // === 2. DATE & BRANCH BAR ===
  const dateBarH = 22;
  page.drawRectangle({ x: 0, y: y - dateBarH, width: W, height: dateBarH, color: LIGHT_BG });
  drawLine(page, 0, y - dateBarH, W, y - dateBarH);
  page.drawText(`Date / التاريخ: ${data.docDate}  ${data.docTime}`, { x: M, y: y - 15, size: 9, font, color: BLACK });
  drawTextRight(page, `Branch / الفرع: ${data.branchName}`, W - M, y - 15, font, 9);
  y -= dateBarH;

  // === 3. GOLD INVOICE NUMBER BAR ===
  const goldBarH = 26;
  page.drawRectangle({ x: 0, y: y - goldBarH, width: W, height: goldBarH, color: GOLD });
  drawTextCenter(page, `TAX Invoice Number ( ${data.docNum} )`, W / 2, y - 18, fontBold, 12, WHITE);
  y -= goldBarH;

  // === 4. BRANCH DETAILS ===
  const branchH = 58;
  page.drawRectangle({ x: 0, y: y - branchH, width: W, height: branchH, color: WHITE });
  drawLine(page, 0, y - branchH, W, y - branchH);

  page.drawText("Branch Details", { x: M, y: y - 14, size: 10, font: fontBold, color: NAVY });
  const bRows = [
    [`Branch Name:  ${data.branchName}`, "اسم الفرع"],
    [`Branch Mobile No:  ${data.branchMobile}`, "رقم جوال الفرع"],
    [`Branch Address:  ${data.branchAddress}`, "عنوان الفرع"],
  ];
  let by = y - 28;
  for (const [en] of bRows) {
    page.drawText(en, { x: M + 5, y: by, size: 8.5, font, color: BLACK });
    by -= 11;
  }
  y -= branchH;

  // === 5. CUSTOMER DETAILS ===
  const custH = 68;
  page.drawRectangle({ x: 0, y: y - custH, width: W, height: custH, color: LIGHT_BG });
  drawLine(page, 0, y - custH, W, y - custH);

  page.drawText("Customer Details", { x: M, y: y - 14, size: 10, font: fontBold, color: NAVY });
  const cRows = [
    [`Customer Name:  ${data.customerName}`],
    [`Mobile No.:  ${data.customerPhone}`],
    [`VAT Reg. No:  ${data.customerVat}`],
    [`CRN No.:  ${data.customerCrn}`],
  ];
  let cy = y - 28;
  for (const [en] of cRows) {
    page.drawText(en, { x: M + 5, y: cy, size: 8.5, font, color: BLACK });
    cy -= 11;
  }
  y -= custH;

  // === 6. LINE ITEMS TABLE ===
  const colX = [M, M + 30, M + 200, M + 295, M + 345, M + 390, M + 440, M + 495];
  const colLabels = ["Sr.#", "Item Description", "Item Code", "Unit", "Qty", "Price", "Total"];
  const tableHeaderH = 22;

  page.drawRectangle({ x: M, y: y - tableHeaderH, width: W - 2 * M, height: tableHeaderH, color: NAVY });
  for (let i = 0; i < colLabels.length; i++) {
    page.drawText(colLabels[i], { x: colX[i] + 3, y: y - 15, size: 7.5, font: fontBold, color: WHITE });
  }
  y -= tableHeaderH;

  const rowH = 18;
  for (let idx = 0; idx < data.lines.length; idx++) {
    const line = data.lines[idx];
    const rowBg = idx % 2 === 0 ? WHITE : LIGHT_BG;
    page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: rowBg });
    drawLine(page, M, y - rowH, W - M, y - rowH, BORDER_COLOR, 0.3);

    const ry = y - 12;
    drawTextCenter(page, String(line.line_num), colX[0] + 15, ry, font, 8);
    page.drawText((line.description || "-").substring(0, 35), { x: colX[1] + 3, y: ry, size: 7.5, font, color: BLACK });
    page.drawText(line.item_code || "-", { x: colX[2] + 3, y: ry, size: 7.5, font, color: BLACK });
    drawTextCenter(page, line.unit || "PCS", colX[3] + 22, ry, font, 7.5);
    drawTextCenter(page, line.quantity.toFixed(2), colX[4] + 22, ry, font, 7.5);
    drawTextCenter(page, line.unit_price.toFixed(2), colX[5] + 25, ry, font, 7.5);
    drawTextRight(page, line.line_total.toFixed(2), colX[6] + 55, ry, font, 7.5);

    y -= rowH;
  }

  if (data.lines.length === 0) {
    page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: WHITE });
    drawTextCenter(page, "No line items", W / 2, y - 12, font, 9, GRAY);
    y -= rowH;
  }

  // Table bottom border
  drawLine(page, M, y, W - M, y, NAVY, 1.5);
  y -= 10;

  // === 7. SUMMARY ===
  const sumX = 330;
  const sumValX = W - M;
  const summaryRows = [
    ["Total Before Discount", data.subtotal.toFixed(2)],
    ["Discount", (data.discountAmount || 0).toFixed(2)],
    ["Total (Excl. VAT)", (data.subtotal - (data.discountAmount || 0)).toFixed(2)],
    ["VAT Amount 15%", (data.taxAmount || 0).toFixed(2)],
  ];

  for (const [label, val] of summaryRows) {
    page.drawText(label, { x: sumX, y, size: 9, font, color: BLACK });
    drawTextRight(page, val, sumValX, y, font, 9);
    y -= 14;
    drawLine(page, sumX, y + 3, sumValX, y + 3, BORDER_COLOR, 0.3);
  }

  // Grand total row (navy background)
  y -= 2;
  page.drawRectangle({ x: sumX - 5, y: y - 6, width: sumValX - sumX + 10, height: 20, color: NAVY });
  page.drawText("Document Total", { x: sumX, y: y, size: 10, font: fontBold, color: WHITE });
  drawTextRight(page, `${data.total.toFixed(2)} ${data.currency}`, sumValX, y, fontBold, 10, WHITE);
  y -= 20;

  // === 8. QR CODE ===
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=png&data=${encodeURIComponent(data.qrData)}`;
    const qrRes = await fetch(qrUrl);
    if (qrRes.ok) {
      const qrBytes = new Uint8Array(await qrRes.arrayBuffer());
      const qrImage = await pdfDoc.embedPng(qrBytes);
      const qrSize = 90;
      page.drawImage(qrImage, { x: M, y: y - qrSize + 10, width: qrSize, height: qrSize });
      page.drawText("Scan for invoice verification", { x: M, y: y - qrSize - 2, size: 7, font, color: GRAY });
    }
  } catch (e) { console.warn("QR code embed skipped:", e); }

  // === 9. FOOTER ===
  const footerY = 30;
  page.drawRectangle({ x: 0, y: 0, width: W, height: footerY + 10, color: LIGHT_BG });
  drawLine(page, 0, footerY + 10, W, footerY + 10, GOLD, 2);
  drawTextCenter(page, "P.O. Box: 35009, Riyadh 11488, Tel: 12985860, Fax: 0112985860/105", W / 2, footerY - 2, font, 8, GRAY);

  // Serialize
  const pdfBytes = await pdfDoc.save();
  return arrayBufferToBase64(pdfBytes.buffer as ArrayBuffer);
}

// ZATCA-style TLV QR data
function buildZatcaQRData(sellerName: string, vatNumber: string, timestamp: string, totalWithVat: string, vatAmount: string): string {
  function tlv(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    return new Uint8Array([tag, valueBytes.length, ...valueBytes]);
  }
  const parts = [
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, timestamp),
    tlv(4, totalWithVat),
    tlv(5, vatAmount),
  ];
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { combined.set(p, offset); offset += p.length; }
  return btoa(String.fromCharCode(...combined));
}

// Fetch invoice data from SAP Service Layer
async function fetchSAPInvoiceData(
  sapConnection: { cookies: string; baseUrl: string },
  sapDocEntry: string
): Promise<any | null> {
  try {
    const url = `${sapConnection.baseUrl}/Invoices(${sapDocEntry})?$select=DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocTime,DocCur,NumAtCard,VatSum,VatSumSy,DocTotal,BPL_IDAssignedToInvoice,U_RegNo,U_MobileNo,U_CRN,U_CustName,DiscountPercent,TotalDiscount`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Cookie: sapConnection.cookies, Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn("SAP Invoice data fetch failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log("SAP Invoice data fetched, DocNum:", data.DocNum, "Lines:", data.DocumentLines?.length);
    return data;
  } catch (e) {
    console.warn("SAP Invoice data error:", e);
    return null;
  }
}

// Fetch business partner from SAP
async function fetchSAPBusinessPartner(
  sapConnection: { cookies: string; baseUrl: string },
  cardCode: string
): Promise<any | null> {
  try {
    const url = `${sapConnection.baseUrl}/BusinessPartners('${encodeURIComponent(cardCode)}')?$select=CardCode,CardName,Phone1,Cellular,FederalTaxID`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Cookie: sapConnection.cookies, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

// Fetch branch/BPL from SAP
async function fetchSAPBranch(
  sapConnection: { cookies: string; baseUrl: string },
  bplId: number
): Promise<any | null> {
  try {
    const url = `${sapConnection.baseUrl}/BusinessPlaces(${bplId})`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Cookie: sapConnection.cookies, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

async function generateFallbackInvoicePDF(
  serviceClient: any,
  payload: {
    invoiceId: string;
    docNum: number;
    customerName: string;
    customerCode: string;
    total?: number;
    sapDocEntry?: string | null;
  }
): Promise<string | null> {
  try {
    console.log("Starting professional fallback PDF generation for invoice:", payload.invoiceId);

    let customerName = payload.customerName;
    let customerCode = payload.customerCode;
    let customerPhone = "-";
    let customerVat = "-";
    let customerCrn = "-";
    let branchName = "Main";
    let branchMobile = "-";
    let branchAddress = "-";
    let docDate = new Date().toISOString().slice(0, 10);
    let docTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let total = payload.total || 0;
    let currency = "SAR";
    let lines: any[] = [];

    // === 1. Try fetching full data from SAP (most reliable source) ===
    let sapDataFetched = false;
    if (payload.sapDocEntry) {
      const sapConnection = await connectToSAP();
      if (sapConnection) {
        try {
          const [sapInvoice, sapBP] = await Promise.all([
            fetchSAPInvoiceData(sapConnection, payload.sapDocEntry),
            fetchSAPBusinessPartner(sapConnection, payload.customerCode),
          ]);

          if (sapInvoice) {
            sapDataFetched = true;
            customerName = sapInvoice.CardName || customerName;
            customerCode = sapInvoice.CardCode || customerCode;
            customerPhone = sapInvoice.U_MobileNo || "-";
            customerVat = sapInvoice.U_RegNo || "-";
            customerCrn = sapInvoice.U_CRN || "-";
            docDate = sapInvoice.DocDate || docDate;
            currency = sapInvoice.DocCur || "SAR";
            subtotal = Number(sapInvoice.DocTotal || 0) - Number(sapInvoice.VatSum || 0) + Number(sapInvoice.TotalDiscount || 0);
            discountAmount = Number(sapInvoice.TotalDiscount || 0);
            taxAmount = Number(sapInvoice.VatSum || 0);
            total = Number(sapInvoice.DocTotal || 0);

            // Parse time
            const rawTime = String(sapInvoice.DocTime || "").padStart(4, "0");
            if (rawTime.length >= 4) {
              const h = parseInt(rawTime.slice(0, 2));
              const m = rawTime.slice(2, 4);
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              docTime = `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
            }

            // Extract lines
            if (Array.isArray(sapInvoice.DocumentLines) && sapInvoice.DocumentLines.length > 0) {
              lines = sapInvoice.DocumentLines.map((l: any) => ({
                line_num: (l.LineNum ?? 0) + 1,
                item_code: l.ItemCode || "-",
                description: l.ItemDescription || "-",
                quantity: Number(l.Quantity || 0),
                unit_price: Number(l.UnitPrice || l.Price || 0),
                unit: l.MeasureUnit || l.UoMCode || "PCS",
                discount_percent: Number(l.DiscountPercent || 0),
                line_total: Number(l.LineTotal || 0),
              }));
              console.log(`Extracted ${lines.length} line items from SAP`);
            }

            // Fetch branch info
            const bplId = sapInvoice.BPL_IDAssignedToInvoice;
            if (bplId) {
              const sapBranch = await fetchSAPBranch(sapConnection, bplId);
              if (sapBranch) {
                branchName = sapBranch.BPLName || sapBranch.BPLNameForeign || "Main";
                branchAddress = [sapBranch.AddressType, sapBranch.Address, sapBranch.City].filter(Boolean).join(", ") || "-";
              }
            }
          }

          if (sapBP) {
            if (!customerPhone || customerPhone === "-") customerPhone = sapBP.Cellular || sapBP.Phone1 || "-";
            if (!customerVat || customerVat === "-") customerVat = sapBP.FederalTaxID || "-";
          }
        } catch (e) {
          console.warn("SAP data fetch error:", e);
        } finally {
          await disconnectSAP(sapConnection);
        }
      }
    }

    // === 2. Fill gaps from local DB ===
    if (!sapDataFetched) {
      const [{ data: invoice }, { data: invoiceLines }] = await Promise.all([
        serviceClient.from("ar_invoices")
          .select("doc_date, doc_due_date, customer_name, customer_code, billing_address, subtotal, discount_amount, tax_amount, total, currency, branch_id")
          .eq("id", payload.invoiceId).maybeSingle(),
        serviceClient.from("ar_invoice_lines")
          .select("line_num, item_code, description, quantity, unit_price, line_total, discount_percent")
          .eq("invoice_id", payload.invoiceId).order("line_num", { ascending: true }),
      ]);

      if (invoice) {
        customerName = invoice.customer_name || customerName;
        customerCode = invoice.customer_code || customerCode;
        docDate = invoice.doc_date || docDate;
        subtotal = Number(invoice.subtotal || 0);
        discountAmount = Number(invoice.discount_amount || 0);
        taxAmount = Number(invoice.tax_amount || 0);
        total = Number(invoice.total || payload.total || 0);
        currency = invoice.currency || "SAR";

        if (invoice.branch_id) {
          const { data: branch } = await serviceClient.from("branches").select("name").eq("id", invoice.branch_id).maybeSingle();
          if (branch) branchName = branch.name || "Main";
        }
      }

      if (Array.isArray(invoiceLines) && invoiceLines.length > 0) {
        lines = invoiceLines.map((l: any) => ({
          line_num: l.line_num, item_code: l.item_code || "-", description: l.description || "-",
          quantity: Number(l.quantity || 0), unit_price: Number(l.unit_price || 0),
          unit: "PCS", discount_percent: Number(l.discount_percent || 0), line_total: Number(l.line_total || 0),
        }));
      }

      // Customer from local BP table
      const { data: bp } = await serviceClient.from("business_partners")
        .select("mobile, phone, tax_id").eq("card_code", customerCode).maybeSingle();
      if (bp) {
        customerPhone = bp.mobile || bp.phone || "-";
        customerVat = bp.tax_id || "-";
      }
    }

    // === 3. Fallback line if still empty ===
    if (lines.length === 0) {
      lines = [{ line_num: 1, item_code: "-", description: "Invoice Amount", quantity: 1, unit_price: total, unit: "PCS", discount_percent: 0, line_total: total }];
    }

    // Fix subtotal if it was 0 but total has value
    if (subtotal === 0 && total > 0) {
      subtotal = total - taxAmount + discountAmount;
      if (subtotal <= 0) subtotal = total;
    }

    // Build ZATCA QR
    const qrData = buildZatcaQRData(
      "Al-Rajhi Building & Constructions Co.",
      "300050645300003",
      new Date(docDate).toISOString(),
      total.toFixed(2),
      taxAmount.toFixed(2)
    );

    const pdfBase64 = await generateProfessionalPDF({
      docNum: payload.docNum,
      docDate,
      docTime,
      customerName,
      customerCode,
      customerPhone,
      customerVat,
      customerCrn,
      branchName,
      branchMobile,
      branchAddress,
      lines,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      currency,
      qrData,
    });

    console.log("Professional fallback PDF generated successfully, base64 length:", pdfBase64.length);
    return pdfBase64;
  } catch (error) {
    console.error("Fallback PDF generation failed:", error);
    return null;
  }
}

async function fetchSAPInvoicePDF(
  sapConnection: { cookies: string; baseUrl: string },
  sapDocEntry: string
): Promise<string | null> {
  const v2Url = sapConnection.baseUrl.replace(/\/b1s\/v1$/, "/b1s/v2");
  const rootUrl = sapConnection.baseUrl.replace(/\/b1s\/v1$/, "");

  const tryPdfRequest = async (label: string, url: string, init: RequestInit): Promise<string | null> => {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        console.warn(`${label} failed:`, response.status, await response.text());
        return null;
      }
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) {
        console.warn(`${label} returned empty payload`);
        return null;
      }
      return arrayBufferToBase64(buffer);
    } catch (error) {
      console.warn(`${label} error:`, error);
      return null;
    }
  };

  // Try SAP methods - using ObjectId (not ObjectCode) based on error feedback
  const attempts = [
    {
      label: "ReportLayoutsService (ObjectId)",
      url: `${sapConnection.baseUrl}/ReportLayoutsService_ExportToPdf`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sapConnection.cookies },
        body: JSON.stringify({ ReportParams: { ObjectId: "13", ObjectKey: sapDocEntry } }),
      },
    },
    {
      label: "ReportLayoutsService v2 (ObjectId)",
      url: `${v2Url}/ReportLayoutsService_ExportToPdf`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sapConnection.cookies },
        body: JSON.stringify({ ReportParams: { ObjectId: "13", ObjectKey: sapDocEntry } }),
      },
    },
    {
      label: "Invoices Print (default)",
      url: `${sapConnection.baseUrl}/Invoices(${sapDocEntry})/Print`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sapConnection.cookies },
        body: JSON.stringify({ OutputType: "PDF" }),
      },
    },
    {
      label: "Invoices $value PDF",
      url: `${sapConnection.baseUrl}/Invoices(${sapDocEntry})/$value`,
      init: {
        method: "GET",
        headers: { Cookie: sapConnection.cookies, Accept: "application/pdf" },
      },
    },
  ];

  for (const attempt of attempts) {
    const pdfBase64 = await tryPdfRequest(attempt.label, attempt.url, attempt.init);
    if (pdfBase64) {
      console.log(`PDF retrieved via: ${attempt.label}`);
      return pdfBase64;
    }
  }

  console.warn("All SAP PDF methods failed for DocEntry:", sapDocEntry);
  return null;
}

async function disconnectSAP(sapConnection: { cookies: string; baseUrl: string }) {
  try {
    await fetch(`${sapConnection.baseUrl}/Logout`, {
      method: "POST",
      headers: { Cookie: sapConnection.cookies },
    });
  } catch (e) {
    console.warn("SAP logout error:", e);
  }
}

// Send via Green API
async function sendViaGreenAPI(
  instanceId: string,
  apiKey: string,
  phone: string,
  message: string,
  pdfBase64: string,
  filename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = phone.replace(/[^0-9]/g, "") + "@c.us";

  try {
    const pdfBytes = base64ToUint8Array(pdfBase64);
    const fileBlob = new Blob([pdfBytes], { type: "application/pdf" });

    const formData = new FormData();
    formData.append("chatId", formattedPhone);
    formData.append("caption", message);
    formData.append("file", fileBlob, filename);

    const uploadResponse = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/sendFileByUpload/${apiKey}`,
      { method: "POST", body: formData }
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      console.warn("Green API sendFileByUpload failed:", uploadResponse.status, err);

      // Fallback: sendFileByUrl with data URI
      const fileByUrlResponse = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/sendFileByUrl/${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: formattedPhone,
            urlFile: `data:application/pdf;base64,${pdfBase64}`,
            fileName: filename,
            caption: message,
          }),
        }
      );

      if (!fileByUrlResponse.ok) {
        return { success: false, error: `Green API failed: ${await fileByUrlResponse.text()}` };
      }
      const result = await fileByUrlResponse.json();
      return { success: true, messageId: result.idMessage };
    }

    const result = await uploadResponse.json();
    return { success: true, messageId: result.idMessage };
  } catch (error) {
    return { success: false, error: `Green API error: ${String(error)}` };
  }
}

// Send via 360dialog
async function sendVia360Dialog(
  apiKey: string,
  phone: string,
  message: string,
  pdfBase64: string,
  filename: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = phone.replace("+", "");

  try {
    const docResponse = await fetch(`https://waba.360dialog.io/v1/messages`, {
      method: "POST",
      headers: { "D360-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "document",
        document: {
          link: `data:application/pdf;base64,${pdfBase64}`,
          filename,
          caption: message,
        },
      }),
    });

    if (!docResponse.ok) {
      return { success: false, error: `360dialog failed: ${await docResponse.text()}` };
    }

    const result = await docResponse.json();
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (e) {
    return { success: false, error: `360dialog error: ${String(e)}` };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "manager", "sales_rep"]);
    if (!roleData || roleData.length === 0) throw new Error("Insufficient permissions");

    const body: RequestBody = await req.json();
    const { invoiceId, docNum, customerName, customerCode, recipientPhone, welcomeMessage, sapDocEntry, total } = body;

    if (!invoiceId || !recipientPhone || !welcomeMessage) {
      throw new Error("Missing required fields: invoiceId, recipientPhone, welcomeMessage");
    }

    // Get WhatsApp config
    const { data: configData, error: configError } = await serviceClient
      .from("whatsapp_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (configError || !configData) {
      throw new Error("WhatsApp is not configured or inactive");
    }

    const apiProvider = configData.api_provider || "360dialog";

    // Try SAP PDF first
    let pdfBase64: string | null = null;

    if (sapDocEntry) {
      const sapConnection = await connectToSAP();
      if (sapConnection) {
        pdfBase64 = await fetchSAPInvoicePDF(sapConnection, sapDocEntry);
        await disconnectSAP(sapConnection);
      } else {
        console.warn("Could not connect to SAP");
      }
    }

    // Fallback: generate PDF from local data
    if (!pdfBase64) {
      console.warn(`SAP PDF unavailable. Generating fallback PDF.`);
      pdfBase64 = await generateFallbackInvoicePDF(serviceClient, {
        invoiceId,
        docNum,
        customerName,
        customerCode,
        total,
        sapDocEntry,
      });
    }

    if (!pdfBase64) {
      throw new Error("Could not generate invoice PDF. Please try again.");
    }

    const filename = `Invoice_${docNum}.pdf`;

    // Send via WhatsApp provider
    let sendResult: { success: boolean; messageId?: string; error?: string };

    if (apiProvider === "greenapi") {
      const instanceId = configData.instance_id;
      const apiKey = Deno.env.get("WHATSAPP_GREENAPI_API_KEY");
      if (!instanceId) throw new Error("Green API instance ID not configured");
      if (!apiKey) throw new Error("WHATSAPP_GREENAPI_API_KEY not configured");
      sendResult = await sendViaGreenAPI(instanceId, apiKey, recipientPhone, welcomeMessage, pdfBase64, filename);
    } else {
      const apiKey = Deno.env.get("WHATSAPP_360DIALOG_API_KEY");
      if (!apiKey) throw new Error("WHATSAPP_360DIALOG_API_KEY not configured");
      sendResult = await sendVia360Dialog(apiKey, recipientPhone, welcomeMessage, pdfBase64, filename);
    }

    if (!sendResult.success) {
      await serviceClient.from("whatsapp_logs").insert({
        document_type: "ar_invoice",
        document_id: invoiceId,
        document_number: String(docNum),
        recipient_phone: recipientPhone,
        recipient_name: customerName,
        message_text: welcomeMessage,
        status: "failed",
        error_message: sendResult.error,
        created_by: user.id,
      });
      throw new Error(sendResult.error || "Failed to send WhatsApp message");
    }

    await serviceClient.from("whatsapp_logs").insert({
      document_type: "ar_invoice",
      document_id: invoiceId,
      document_number: String(docNum),
      recipient_phone: recipientPhone,
      recipient_name: customerName,
      message_text: welcomeMessage,
      status: "sent",
      whatsapp_message_id: sendResult.messageId,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: sendResult.messageId, provider: apiProvider, hasPdf: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("WhatsApp Invoice Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
