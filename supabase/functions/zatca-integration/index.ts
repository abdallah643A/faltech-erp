import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ZATCASettings {
  id?: string;
  vat_number: string;
  organization_name: string;
  organization_name_ar?: string;
  cr_number?: string;
  street?: string;
  building_number?: string;
  city?: string;
  district?: string;
  postal_code?: string;
  country_code?: string;
  environment: string;
  api_base_url: string;
  compliance_csid?: string;
  compliance_secret?: string;
  production_csid?: string;
  production_secret?: string;
  previous_invoice_hash?: string;
  invoice_counter?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case "generate_invoice_xml":
        result = await generateInvoiceXML(supabase, params, userId);
        break;
      case "submit_clearance":
        result = await submitForClearance(supabase, params, userId);
        break;
      case "submit_reporting":
        result = await submitForReporting(supabase, params, userId);
        break;
      case "check_status":
        result = await checkSubmissionStatus(supabase, params, userId);
        break;
      case "onboard_csid":
        result = await onboardCSID(supabase, params, userId);
        break;
      case "simulate_clearance":
        result = await simulateClearance(supabase, params, userId);
        break;
      case "generate_csr":
        result = await generateCSR(supabase, params, userId);
        break;
      case "compliance_check":
        result = await complianceCheck(supabase, params, userId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("ZATCA Integration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getSettings(supabase: any): Promise<ZATCASettings> {
  const { data, error } = await supabase
    .from("zatca_settings")
    .select("*")
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error("ZATCA settings not configured. Please set up your organization details first.");
  return data;
}

async function logAction(supabase: any, submissionId: string | null, action: string, requestUrl: string, requestBody: any, responseStatus: number, responseBody: any, errorMsg: string | null, durationMs: number, userId: string) {
  await supabase.from("zatca_logs").insert({
    submission_id: submissionId,
    action,
    request_url: requestUrl,
    request_body: typeof requestBody === "string" ? requestBody : JSON.stringify(requestBody),
    response_status: responseStatus,
    response_body: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
    error_message: errorMsg,
    duration_ms: durationMs,
    created_by: userId,
  });
}

// ==================== Phase 2 Cryptographic Functions ====================

async function computeSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function computeSHA256Base64(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

// TLV (Tag-Length-Value) encoding for ZATCA QR Code Phase 2
function encodeTLV(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const result = new Uint8Array(2 + valueBytes.length);
  result[0] = tag;
  result[1] = valueBytes.length;
  result.set(valueBytes, 2);
  return result;
}

function encodeTLVBinary(tag: number, valueBytes: Uint8Array): Uint8Array {
  const result = new Uint8Array(2 + valueBytes.length);
  result[0] = tag;
  result[1] = valueBytes.length;
  result.set(valueBytes, 2);
  return result;
}

function generatePhase2QRCode(
  settings: ZATCASettings,
  doc: any,
  invoiceHash: string,
  digitalSignature: string,
  publicKey: string
): string {
  const sellerName = settings.organization_name;
  const vatNumber = settings.vat_number;
  const timestamp = new Date().toISOString();
  const total = (doc.total || 0).toFixed(2);
  const taxAmount = (doc.tax_amount || 0).toFixed(2);

  // Phase 2 TLV tags:
  // 1 = Seller Name, 2 = VAT Number, 3 = Timestamp, 4 = Total (with VAT),
  // 5 = VAT Amount, 6 = Invoice Hash, 7 = ECDSA Signature, 8 = Public Key
  const parts: Uint8Array[] = [
    encodeTLV(1, sellerName),
    encodeTLV(2, vatNumber),
    encodeTLV(3, timestamp),
    encodeTLV(4, total),
    encodeTLV(5, taxAmount),
    encodeTLV(6, invoiceHash),
    encodeTLV(7, digitalSignature),
    encodeTLV(8, publicKey),
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return btoa(String.fromCharCode(...combined));
}

// Get next invoice counter and previous invoice hash (PIH) for chaining
async function getNextCounterAndPIH(supabase: any, settingsId: string): Promise<{ counter: number; previousHash: string }> {
  const { data: settings } = await supabase
    .from("zatca_settings")
    .select("invoice_counter, previous_invoice_hash")
    .eq("id", settingsId)
    .single();

  const counter = (settings?.invoice_counter || 0) + 1;
  const previousHash = settings?.previous_invoice_hash || "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=="; // ZATCA default genesis hash

  return { counter, previousHash };
}

// Update counter and PIH after successful submission
async function updateCounterAndPIH(supabase: any, settingsId: string, counter: number, newHash: string) {
  await supabase
    .from("zatca_settings")
    .update({
      invoice_counter: counter,
      previous_invoice_hash: newHash,
    })
    .eq("id", settingsId);
}

// ==================== XML Building (Phase 2 Enhanced) ====================

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildInvoiceXML(
  doc: any,
  settings: ZATCASettings,
  invoiceUUID: string,
  lines: any[],
  counter: number,
  previousHash: string
): string {
  const issueDate = doc.doc_date || new Date().toISOString().split("T")[0];
  const issueTime = new Date().toISOString().split("T")[1]?.split(".")[0] || "12:00:00";
  const invoiceTypeCode = doc.invoice_type === "standard" ? "388" : "381";
  const currencyCode = doc.currency || "SAR";
  const invoiceSubType = doc.invoice_sub_type || (doc.invoice_type === "standard" ? "0100000" : "0200000");

  // Buyer info for standard invoices
  const buyerVAT = doc.customer_vat || "";
  const buyerCR = doc.customer_cr || "";
  const buyerAddress = doc.billing_address || "";

  const lineItems = (lines || []).map((line: any, idx: number) => {
    const lineTotal = line.line_total || 0;
    const taxPercent = line.tax_percent || 15;
    const taxAmount = lineTotal * taxPercent / 100;
    const discountAmount = line.discount_amount || 0;

    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${line.unit || "PCE"}">${line.quantity || 1}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currencyCode}">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      ${discountAmount > 0 ? `<cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
        <cbc:Amount currencyID="${currencyCode}">${discountAmount.toFixed(2)}</cbc:Amount>
      </cac:AllowanceCharge>` : ""}
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${currencyCode}">${lineTotal.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>${taxPercent.toFixed(2)}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(line.description || line.item_description || line.item_code || "Item")}</cbc:Name>
        ${line.item_code ? `<cac:SellersItemIdentification><cbc:ID>${escapeXml(line.item_code)}</cbc:ID></cac:SellersItemIdentification>` : ""}
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currencyCode}">${(line.unit_price || 0).toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  }).join("");

  const taxAmount = doc.tax_amount || 0;
  const subtotal = doc.subtotal || 0;
  const total = doc.total || 0;
  const discountTotal = doc.discount_amount || 0;

  // Determine tax category based on exemption
  const taxCategoryCode = doc.tax_exemption_reason ? "E" : "S";
  const taxExemptionElement = doc.tax_exemption_reason
    ? `<cbc:TaxExemptionReasonCode>${doc.tax_exemption_code || "VATEX-SA-EDU"}</cbc:TaxExemptionReasonCode>
       <cbc:TaxExemptionReason>${escapeXml(doc.tax_exemption_reason)}</cbc:TaxExemptionReason>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent>
        <!-- Phase 2: Digital signature placeholder - populated during signing -->
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
                                    xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
                                    xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
          <sac:SignatureInformation>
            <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
            <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
            <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
              <ds:SignedInfo>
                <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
                <ds:Reference Id="invoiceSignedData" URI="">
                  <ds:Transforms>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                      <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                    </ds:Transform>
                    <ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                  </ds:Transforms>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue>INVOICE_DIGEST_PLACEHOLDER</ds:DigestValue>
                </ds:Reference>
                <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue>PROPS_DIGEST_PLACEHOLDER</ds:DigestValue>
                </ds:Reference>
              </ds:SignedInfo>
              <ds:SignatureValue>SIGNATURE_VALUE_PLACEHOLDER</ds:SignatureValue>
              <ds:KeyInfo>
                <ds:X509Data>
                  <ds:X509Certificate>CERTIFICATE_PLACEHOLDER</ds:X509Certificate>
                </ds:X509Data>
              </ds:KeyInfo>
              <ds:Object>
                <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
                  <xades:SignedProperties Id="xadesSignedProperties">
                    <xades:SignedSignatureProperties>
                      <xades:SigningTime>${issueDate}T${issueTime}</xades:SigningTime>
                      <xades:SigningCertificate>
                        <xades:Cert>
                          <xades:CertDigest>
                            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                            <ds:DigestValue>CERT_DIGEST_PLACEHOLDER</ds:DigestValue>
                          </xades:CertDigest>
                          <xades:IssuerSerial>
                            <ds:X509IssuerName>ISSUER_NAME_PLACEHOLDER</ds:X509IssuerName>
                            <ds:X509SerialNumber>SERIAL_NUMBER_PLACEHOLDER</ds:X509SerialNumber>
                          </xades:IssuerSerial>
                        </xades:Cert>
                      </xades:SigningCertificate>
                    </xades:SignedSignatureProperties>
                  </xades:SignedProperties>
                </xades:QualifyingProperties>
              </ds:Object>
            </ds:Signature>
          </sac:SignatureInformation>
        </sig:UBLDocumentSignatures>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${doc.doc_num || doc.document_number || "INV-001"}</cbc:ID>
  <cbc:UUID>${invoiceUUID}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoiceSubType}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${counter}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${previousHash}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">QR_CODE_PLACEHOLDER</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:Signature>
    <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
    <cbc:SignatoryParty>
      <cac:PartyIdentification><cbc:ID>${settings.vat_number}</cbc:ID></cac:PartyIdentification>
    </cbc:SignatoryParty>
    <cbc:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>urn:oasis:names:specification:ubl:signature:1</cbc:URI></cac:ExternalReference>
    </cbc:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${settings.cr_number || ""}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(settings.street || "")}</cbc:StreetName>
        <cbc:BuildingNumber>${settings.building_number || ""}</cbc:BuildingNumber>
        <cbc:CityName>${escapeXml(settings.city || "")}</cbc:CityName>
        <cbc:PostalZone>${settings.postal_code || ""}</cbc:PostalZone>
        <cbc:CountrySubentity>${escapeXml(settings.district || "")}</cbc:CountrySubentity>
        <cac:Country><cbc:IdentificationCode>${settings.country_code || "SA"}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${settings.vat_number}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(settings.organization_name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${buyerVAT ? `<cac:PartyIdentification><cbc:ID schemeID="VAT">${escapeXml(buyerVAT)}</cbc:ID></cac:PartyIdentification>` : ""}
      ${buyerCR ? `<cac:PartyIdentification><cbc:ID schemeID="CRN">${escapeXml(buyerCR)}</cbc:ID></cac:PartyIdentification>` : ""}
      ${buyerAddress ? `<cac:PostalAddress><cbc:StreetName>${escapeXml(buyerAddress)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>` : ""}
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(buyerVAT || "")}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(doc.customer_name || "Customer")}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${doc.payment_means_code ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>${doc.payment_means_code}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>` : ""}
  ${discountTotal > 0 ? `<cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${currencyCode}">${discountTotal.toFixed(2)}</cbc:Amount>
    <cac:TaxCategory>
      <cbc:ID>${taxCategoryCode}</cbc:ID>
      <cbc:Percent>15.00</cbc:Percent>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:AllowanceCharge>` : ""}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${taxCategoryCode}</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        ${taxExemptionElement}
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${taxAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    ${discountTotal > 0 ? `<cbc:AllowanceTotalAmount currencyID="${currencyCode}">${discountTotal.toFixed(2)}</cbc:AllowanceTotalAmount>` : ""}
    <cbc:PayableAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItems}
</Invoice>`;
}

// ==================== Core Functions ====================

async function generateInvoiceXML(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);
  const { document_type, document_id } = params;

  let doc: any;
  let lines: any[] = [];

  if (document_type === "invoice" || document_type === "pos_invoice") {
    const { data } = await supabase.from("ar_invoices").select("*").eq("id", document_id).single();
    doc = data;
    const { data: lineData } = await supabase.from("ar_invoice_lines").select("*").eq("invoice_id", document_id);
    lines = lineData || [];
  } else if (document_type === "credit_memo") {
    const { data } = await supabase.from("ar_credit_memos").select("*").eq("id", document_id).single();
    doc = data;
    const { data: lineData } = await supabase.from("ar_credit_memo_lines").select("*").eq("credit_memo_id", document_id);
    lines = lineData || [];
  } else if (document_type === "return") {
    const { data } = await supabase.from("ar_returns").select("*").eq("id", document_id).single();
    doc = data;
    const { data: lineData } = await supabase.from("ar_return_lines").select("*").eq("return_id", document_id);
    lines = lineData || [];
  }

  if (!doc) throw new Error("Document not found");

  const invoiceUUID = crypto.randomUUID();
  const invoiceType = document_type === "pos_invoice" ? "simplified" : "standard";
  const submissionType = invoiceType === "standard" ? "clearance" : "reporting";

  // Phase 2: Get counter and PIH for invoice chaining
  const { counter, previousHash } = await getNextCounterAndPIH(supabase, settings.id!);

  const xml = buildInvoiceXML(
    { ...doc, invoice_type: invoiceType },
    settings,
    invoiceUUID,
    lines,
    counter,
    previousHash
  );

  // Phase 2: Compute SHA-256 hash
  const hash = await computeSHA256Base64(xml);

  // Phase 2: Generate TLV-encoded QR code with cryptographic elements
  const digitalSignature = "PLACEHOLDER_ECDSA_SIGNATURE"; // Real signing requires private key
  const publicKey = settings.production_csid || "PLACEHOLDER_PUBLIC_KEY";
  const qrCode = generatePhase2QRCode(settings, doc, hash, digitalSignature, publicKey);

  // Replace QR placeholder in XML
  const signedXml = xml.replace("QR_CODE_PLACEHOLDER", qrCode)
    .replace("INVOICE_DIGEST_PLACEHOLDER", hash);

  // Create submission record
  const { data: submission, error } = await supabase.from("zatca_submissions").insert({
    document_type,
    document_id,
    document_number: doc.doc_num?.toString() || doc.document_number,
    invoice_type: invoiceType,
    invoice_sub_type: invoiceType === "standard" ? "0100000" : "0200000",
    uuid: invoiceUUID,
    invoice_hash: hash,
    xml_content: signedXml,
    qr_code: qrCode,
    submission_type: submissionType,
    status: "pending",
    invoice_counter: counter,
    previous_invoice_hash: previousHash,
    created_by: userId,
  }).select().single();

  if (error) throw error;

  // Update counter and PIH
  await updateCounterAndPIH(supabase, settings.id!, counter, hash);

  return { success: true, submission, qr_code: qrCode, phase2: { counter, hash, uuid: invoiceUUID } };
}

async function submitForClearance(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);
  const { submission_id } = params;

  const { data: submission } = await supabase.from("zatca_submissions").select("*").eq("id", submission_id).single();
  if (!submission) throw new Error("Submission not found");

  const startTime = Date.now();

  if (settings.environment === "sandbox" || settings.environment === "simulation") {
    const simulatedResponse = {
      clearanceStatus: "CLEARED",
      reportingStatus: "NOT_REQUIRED",
      clearedInvoice: btoa(submission.xml_content || ""),
      validationResults: {
        infoMessages: [
          { type: "INFO", code: "XSD_ZATCA_VALID", message: "Compliant with UBL 2.1 standards in line with ZATCA specifications", status: "PASS" },
          { type: "INFO", code: "SIGNATURE_VALID", message: "Digital signature is valid (Phase 2)", status: "PASS" },
        ],
        warningMessages: [],
        errorMessages: [],
        status: "PASS",
      },
    };

    await supabase.from("zatca_submissions").update({
      status: "cleared",
      zatca_status: "CLEARED",
      zatca_clearing_status: "CLEARED",
      signed_xml: submission.xml_content,
      validation_results: simulatedResponse.validationResults,
      submitted_at: new Date().toISOString(),
      cleared_at: new Date().toISOString(),
    }).eq("id", submission_id);

    await logAction(supabase, submission_id, "clearance", `${settings.api_base_url}/invoices/clearance/single`, { invoiceHash: submission.invoice_hash }, 200, simulatedResponse, null, Date.now() - startTime, userId);

    return { success: true, status: "CLEARED", response: simulatedResponse };
  }

  // Production ZATCA API call
  if (!settings.production_csid || !settings.production_secret) {
    throw new Error("Production CSID not configured. Please complete onboarding first.");
  }

  const apiUrl = `${settings.api_base_url}/invoices/clearance/single`;
  const requestBody = {
    invoiceHash: submission.invoice_hash,
    uuid: submission.uuid,
    invoice: btoa(submission.signed_xml || submission.xml_content),
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        Authorization: `Basic ${btoa(`${settings.production_csid}:${settings.production_secret}`)}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await response.json();

    const newStatus = responseBody.clearanceStatus === "CLEARED" ? "cleared" : responseBody.clearanceStatus === "NOT_CLEARED" ? "rejected" : "warning";

    await supabase.from("zatca_submissions").update({
      status: newStatus,
      zatca_status: responseBody.clearanceStatus,
      zatca_clearing_status: responseBody.clearanceStatus,
      zatca_reporting_status: responseBody.reportingStatus,
      validation_results: responseBody.validationResults,
      signed_xml: responseBody.clearedInvoice ? atob(responseBody.clearedInvoice) : null,
      warning_messages: responseBody.validationResults?.warningMessages,
      error_messages: responseBody.validationResults?.errorMessages,
      submitted_at: new Date().toISOString(),
      cleared_at: newStatus === "cleared" ? new Date().toISOString() : null,
      retry_count: (submission.retry_count || 0) + 1,
    }).eq("id", submission_id);

    await logAction(supabase, submission_id, "clearance", apiUrl, requestBody, response.status, responseBody, null, Date.now() - startTime, userId);

    return { success: newStatus !== "rejected", status: responseBody.clearanceStatus, response: responseBody };
  } catch (fetchError: any) {
    await logAction(supabase, submission_id, "clearance", apiUrl, requestBody, 0, null, fetchError.message, Date.now() - startTime, userId);
    await supabase.from("zatca_submissions").update({ status: "error", error_messages: [{ message: fetchError.message }], retry_count: (submission.retry_count || 0) + 1 }).eq("id", submission_id);
    throw fetchError;
  }
}

async function submitForReporting(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);
  const { submission_id } = params;

  const { data: submission } = await supabase.from("zatca_submissions").select("*").eq("id", submission_id).single();
  if (!submission) throw new Error("Submission not found");

  const startTime = Date.now();

  if (settings.environment === "sandbox" || settings.environment === "simulation") {
    const simulatedResponse = {
      reportingStatus: "REPORTED",
      validationResults: {
        status: "PASS",
        infoMessages: [
          { type: "INFO", code: "REPORTED", message: "Invoice reported successfully (Phase 2)", status: "PASS" },
        ],
        warningMessages: [],
        errorMessages: [],
      },
    };

    await supabase.from("zatca_submissions").update({
      status: "reported",
      zatca_status: "REPORTED",
      zatca_reporting_status: "REPORTED",
      validation_results: simulatedResponse.validationResults,
      submitted_at: new Date().toISOString(),
    }).eq("id", submission_id);

    await logAction(supabase, submission_id, "reporting", `${settings.api_base_url}/invoices/reporting/single`, { invoiceHash: submission.invoice_hash }, 200, simulatedResponse, null, Date.now() - startTime, userId);

    return { success: true, status: "REPORTED", response: simulatedResponse };
  }

  if (!settings.production_csid || !settings.production_secret) {
    throw new Error("Production CSID not configured.");
  }

  const apiUrl = `${settings.api_base_url}/invoices/reporting/single`;
  const requestBody = {
    invoiceHash: submission.invoice_hash,
    uuid: submission.uuid,
    invoice: btoa(submission.signed_xml || submission.xml_content),
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      "Accept-Language": "en",
      Authorization: `Basic ${btoa(`${settings.production_csid}:${settings.production_secret}`)}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json();
  const newStatus = responseBody.reportingStatus === "REPORTED" ? "reported" : "error";

  await supabase.from("zatca_submissions").update({
    status: newStatus,
    zatca_status: responseBody.reportingStatus,
    zatca_reporting_status: responseBody.reportingStatus,
    validation_results: responseBody.validationResults,
    submitted_at: new Date().toISOString(),
  }).eq("id", submission_id);

  await logAction(supabase, submission_id, "reporting", apiUrl, requestBody, response.status, responseBody, null, Date.now() - startTime, userId);

  return { success: newStatus === "reported", status: responseBody.reportingStatus, response: responseBody };
}

async function checkSubmissionStatus(supabase: any, params: any, _userId: string) {
  const { submission_id } = params;
  const { data } = await supabase.from("zatca_submissions").select("*").eq("id", submission_id).single();
  return { submission: data };
}

async function onboardCSID(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);
  const { otp } = params;

  if (settings.environment === "sandbox" || settings.environment === "simulation") {
    const simulatedCSID = `SIM-CSID-${Date.now()}`;
    const simulatedSecret = `SIM-SECRET-${Date.now()}`;

    await supabase.from("zatca_settings").update({
      compliance_csid: simulatedCSID,
      compliance_secret: simulatedSecret,
      production_csid: simulatedCSID,
      production_secret: simulatedSecret,
      otp: otp,
    }).eq("id", settings.id);

    await logAction(supabase, null, "onboarding", `${settings.api_base_url}/compliance`, { otp }, 200, { csid: simulatedCSID }, null, 100, userId);

    return { success: true, message: "Simulated CSID onboarding completed (Phase 2 ready)", csid: simulatedCSID };
  }

  // Phase 2 Production: CSR generation + compliance CSID + production CSID
  throw new Error("Production onboarding requires CSR generation through ZATCA portal. Use 'generate_csr' action first, then submit the CSR to ZATCA Fatoora Portal.");
}

async function simulateClearance(supabase: any, params: any, userId: string) {
  const xmlResult = await generateInvoiceXML(supabase, params, userId);
  const clearResult = await submitForClearance(supabase, { submission_id: xmlResult.submission.id }, userId);
  return { ...xmlResult, clearance: clearResult };
}

// Phase 2: Generate CSR (Certificate Signing Request)
async function generateCSR(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);

  // CSR configuration for ZATCA
  const csrConfig = {
    commonName: settings.organization_name,
    organizationName: settings.organization_name,
    organizationalUnitName: settings.vat_number,
    countryName: settings.country_code || "SA",
    serialNumber: `1-${settings.organization_name}|2-${settings.cr_number || ""}|3-${settings.vat_number}`,
    uid: settings.vat_number,
    title: "1100",
    registeredAddress: `${settings.street || ""} ${settings.building_number || ""} ${settings.city || ""}`.trim(),
    businessCategory: params.business_category || "Manufacturing",
  };

  // In production, this would use OpenSSL or a crypto library to generate actual CSR
  // For now, we generate a placeholder that shows the structure
  const csrData = btoa(JSON.stringify(csrConfig));

  await logAction(supabase, null, "generate_csr", "local", csrConfig, 200, { csr: csrData }, null, 50, userId);

  return {
    success: true,
    message: "CSR configuration generated. Submit this to ZATCA Fatoora Portal to obtain your Compliance CSID.",
    csr_config: csrConfig,
    csr_data: csrData,
    next_steps: [
      "1. Log in to ZATCA Fatoora Portal (https://fatoora.zatca.gov.sa/)",
      "2. Navigate to 'Onboard New Solution'",
      "3. Generate an OTP",
      "4. Use the Compliance CSID API with the OTP and CSR",
      "5. After compliance testing, request Production CSID",
    ],
  };
}

// Phase 2: Compliance readiness check
async function complianceCheck(supabase: any, params: any, userId: string) {
  const settings = await getSettings(supabase);

  const checks: { name: string; status: "pass" | "fail" | "warning"; message: string }[] = [];

  // Organization details
  checks.push({
    name: "Organization Name",
    status: settings.organization_name ? "pass" : "fail",
    message: settings.organization_name ? "Configured" : "Missing organization name",
  });

  checks.push({
    name: "VAT Number",
    status: settings.vat_number?.match(/^3\d{13}3$/) ? "pass" : settings.vat_number ? "warning" : "fail",
    message: settings.vat_number?.match(/^3\d{13}3$/) ? "Valid format (3XXXXXXXXXX0003)" : settings.vat_number ? "Format may not match ZATCA requirements" : "Missing VAT number",
  });

  checks.push({
    name: "Commercial Registration",
    status: settings.cr_number ? "pass" : "warning",
    message: settings.cr_number ? "Configured" : "Recommended for standard invoices",
  });

  // Address
  const hasAddress = settings.street && settings.building_number && settings.city && settings.postal_code && settings.district;
  checks.push({
    name: "Seller Address",
    status: hasAddress ? "pass" : "warning",
    message: hasAddress ? "Complete address configured" : "Some address fields are missing (required for Phase 2)",
  });

  // CSID
  checks.push({
    name: "Compliance CSID",
    status: settings.compliance_csid ? "pass" : "fail",
    message: settings.compliance_csid ? "Configured" : "Not yet onboarded - required for Phase 2",
  });

  checks.push({
    name: "Production CSID",
    status: settings.production_csid ? "pass" : settings.environment === "production" ? "fail" : "warning",
    message: settings.production_csid ? "Configured" : "Required for production environment",
  });

  // Invoice counter
  checks.push({
    name: "Invoice Counter (ICV)",
    status: "pass",
    message: `Current counter: ${settings.invoice_counter || 0}`,
  });

  // Previous Invoice Hash (PIH)
  checks.push({
    name: "Invoice Hash Chain (PIH)",
    status: settings.previous_invoice_hash ? "pass" : "pass",
    message: settings.previous_invoice_hash ? "Chain active" : "Will use ZATCA genesis hash for first invoice",
  });

  // Environment
  checks.push({
    name: "Environment",
    status: settings.environment === "production" ? "pass" : "warning",
    message: `Current: ${settings.environment}`,
  });

  const passCount = checks.filter(c => c.status === "pass").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const overallStatus = failCount > 0 ? "not_ready" : passCount === checks.length ? "ready" : "partial";

  return {
    success: true,
    overall_status: overallStatus,
    phase: "Phase 2 - Integration",
    checks,
    summary: {
      total: checks.length,
      passed: passCount,
      warnings: checks.filter(c => c.status === "warning").length,
      failed: failCount,
    },
  };
}
