import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SAPSession {
  sessionId: string;
  routeId: string;
}

interface SAPError {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    };
  };
}

interface PushResult {
  success: boolean;
  entityId: string;
  entityCode: string;
  sapDocEntry?: string;
  error?: string;
  errorDetails?: string;
}

// SAP B1 Service Layer API handler
class SAPB1Client {
  private baseUrl: string;
  private companyDB: string;
  private username: string;
  private password: string;
  private session: SAPSession | null = null;

  constructor(settings?: { service_layer_url: string; company_db: string; username: string; password: string }) {
    this.baseUrl = settings?.service_layer_url || Deno.env.get('SAP_B1_SERVICE_LAYER_URL') || '';
    this.companyDB = settings?.company_db || Deno.env.get('SAP_B1_COMPANY_DB') || '';
    this.username = settings?.username || Deno.env.get('SAP_B1_USERNAME') || '';
    this.password = settings?.password || Deno.env.get('SAP_B1_PASSWORD') || '';
  }

  async login(): Promise<boolean> {
    try {
      if (!this.baseUrl) {
        console.error('SAP Login error: No Service Layer URL configured');
        return false;
      }
      console.log(`SAP Login attempt to: ${this.baseUrl}, DB: ${this.companyDB}, User: ${this.username}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(`${this.baseUrl}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CompanyDB: this.companyDB,
          UserName: this.username,
          Password: this.password,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('SAP Login failed:', await response.text());
        return false;
      }

      const cookies = response.headers.get('set-cookie') || '';
      const sessionMatch = cookies.match(/B1SESSION=([^;]+)/);
      const routeMatch = cookies.match(/ROUTEID=([^;]+)/);

      if (sessionMatch) {
        this.session = {
          sessionId: sessionMatch[1],
          routeId: routeMatch ? routeMatch[1] : '',
        };
        console.log('SAP Login successful');
        return true;
      }
      return false;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('SAP Login timeout: Connection took longer than 15 seconds');
      } else {
        console.error('SAP Login error:', error);
      }
      return false;
    }
  }

  async logout(): Promise<void> {
    if (!this.session) return;
    try {
      await fetch(`${this.baseUrl}/Logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('SAP Logout error:', error);
    }
  }

  private getHeaders(preferMaxPageSize?: number): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': `B1SESSION=${this.session?.sessionId}; ROUTEID=${this.session?.routeId}`,
    };
    if (preferMaxPageSize) {
      headers['Prefer'] = `odata.maxpagesize=${preferMaxPageSize}`;
    }
    return headers;
  }

  private async fetchJson<T>(url: string, preferMaxPageSize?: number): Promise<T> {
    const response = await fetch(url, { headers: this.getHeaders(preferMaxPageSize) });
    const text = await response.text();

    if (!response.ok) {
      const snippet = text.slice(0, 800);
      // If 400 with invalid property and URL has $select, retry without $select
      if (response.status === 400 && snippet.includes("Property '") && snippet.includes("is invalid") && url.includes('$select=')) {
        console.warn('SAP $select property invalid, retrying without $select:', snippet.slice(0, 200));
        const retryUrl = url.replace(/&?\$select=[^&]*/, '').replace(/\?&/, '?').replace(/\?$/, '');
        const retryResponse = await fetch(retryUrl, { headers: this.getHeaders(preferMaxPageSize) });
        const retryText = await retryResponse.text();
        if (!retryResponse.ok) {
          console.error('SAP retry also failed:', retryText.slice(0, 400));
          throw new Error(`SAP request failed (${retryResponse.status})`);
        }
        return retryText ? (JSON.parse(retryText) as T) : ({} as T);
      }
      console.error('SAP Service Layer request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        bodySnippet: snippet,
      });
      throw new Error(`SAP request failed (${response.status})`);
    }

    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  async getResource<T = any>(path: string): Promise<T> {
    return this.fetchJson<T>(`${this.baseUrl}${path}`);
  }

  async getFixedAssetEndBalance(itemCode: string, fiscalYear: string, depreciationArea: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/FixedAssetItemsService_GetAssetEndBalance`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          FixedAssetValuesParams: {
            ItemCode: itemCode,
            FiscalYear: fiscalYear,
            DepreciationArea: depreciationArea,
          },
        }),
      });

      if (!response.ok) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  private parseSAPError(responseText: string): string {
    try {
      const errorData = JSON.parse(responseText) as SAPError;
      if (errorData.error?.message?.value) {
        return errorData.error.message.value;
      }
      return responseText.slice(0, 500);
    } catch {
      return responseText.slice(0, 500);
    }
  }

  // Business Partners
  async getBusinessPartners(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/BusinessPartners?${filter}$skip=${skip}&$top=${top}&$orderby=CreateDate desc&$select=CardCode,CardName,CardType,Phone1,Phone2,EmailAddress,ContactPerson,BillToState,ShipToState,CreditLimit,Currency,PayTermsGrpCode,Fax,Notes,FreeText,City,Country,Industry,AliasName,FederalTaxID,Territory,Series,OwnerCode,CardForeignName,Valid,Frozen,GroupCode,ContactEmployees,CurrentAccountBalance,Website,BPAddresses`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string; __next?: string }>(url, top);
    const items = Array.isArray((data as any)?.value) ? (data as any).value : Array.isArray(data as any) ? (data as any) : [];
    const nextLink = (data as any)['@odata.nextLink'] || (data as any)['odata.nextLink'] || (data as any).__next;
    return {
      items,
      hasMore: !!nextLink || items.length >= top,
    };
  }

  // Numbering Series (NNM1) - try direct SQL query first, fallback to SeriesService
  async getNumberingSeries(): Promise<any[]> {
    try {
      // Method 1: Try direct SQL query on NNM1 (most reliable)
      const sqlSeries = await this.getNumberingSeriesViaSQL();
      if (sqlSeries.length > 0) {
        console.log(`Got ${sqlSeries.length} series via direct SQL query`);
        return sqlSeries;
      }
      
      // Method 2: Fallback to SeriesService API
      console.log('SQL query returned no results, falling back to SeriesService API');
      return await this.getNumberingSeriesViaAPI();
    } catch (error) {
      console.error('Error fetching numbering series:', error);
      return [];
    }
  }

  // Query NNM1 table directly via SQLQueries/CrossJoin 
  private async getNumberingSeriesViaSQL(): Promise<any[]> {
    try {
      // Try using the SQLQueries service to query NNM1 directly
      const sqlQuery = `SELECT T0."Series", T0."SeriesName", T0."Remark" as "Prefix", T0."InitialNum" as "FirstNo", T0."NextNumber" as "NextNo", T0."LastNum" as "LastNo", T0."ObjectCode", T0."DocSubType" as "DocumentSubType", T0."IsDefault", T0."Locked", T0."GroupCode", T0."Remark" as "Remarks" FROM "NNM1" T0 ORDER BY T0."ObjectCode", T0."Series"`;
      
      const response = await fetch(`${this.baseUrl}/SQLQueries('getNNM1')/List`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.value && data.value.length > 0) {
          return data.value;
        }
      }
      
      // Try alternative: POST to QueryService 
      const queryResponse = await fetch(`${this.baseUrl}/QueryService_PostQuery`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          QueryPath: "$crossjoin(NumberingSeries)",
          QueryOption: "$top=500"
        }),
      });
      
      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        if (queryData.value && queryData.value.length > 0) {
          return queryData.value;
        }
      }
      
      console.log('Direct SQL query methods not available, will use API method');
      return [];
    } catch (e: any) {
      console.log(`SQL query method failed: ${e.message}`);
      return [];
    }
  }

  // Fallback: Use SeriesService API with multiple parameter formats
  private async getNumberingSeriesViaAPI(): Promise<any[]> {
    // SAP NNM1 DocSubType values: C=Customer, S=Supplier, L=Lead for BP
    // For documents: I=Items, S=Service, or empty/-- for default
    const objectTypeMappings: { name: string; code: string; subTypes: string[] }[] = [
      { name: 'BusinessPartners', code: '2', subTypes: ['C', 'S', 'L'] },
      { name: 'Invoices', code: '13', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'CreditNotes', code: '14', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'DeliveryNotes', code: '15', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'Orders', code: '17', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'PurchaseInvoices', code: '18', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'PurchaseDeliveryNotes', code: '20', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'InventoryGenExits', code: '21', subTypes: ['-', '--', ''] },
      { name: 'PurchaseOrders', code: '22', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'Quotations', code: '23', subTypes: ['I', 'S', '-', '--', ''] },
      { name: 'IncomingPayments', code: '24', subTypes: ['-', '--', ''] },
      { name: 'JournalEntries', code: '30', subTypes: ['-', '--', ''] },
      { name: 'PurchaseRequests', code: '1470000113', subTypes: ['-', '--', ''] },
      { name: 'PurchaseQuotations', code: '540000006', subTypes: ['-', '--', ''] },
    ];
    
    const allSeries: any[] = [];
    const seenKeys = new Set<string>();
    const batchSize = 3;

    for (let i = 0; i < objectTypeMappings.length; i += batchSize) {
      const batch = objectTypeMappings.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(async (obj) => {
        let series: any[] = [];
        
        // Document param: try integer first then string
        const docParams: (string | number)[] = [parseInt(obj.code) || obj.code, obj.code];

        for (const subType of obj.subTypes) {
          if (series.length > 0) break;
          
          for (const docParam of docParams) {
            try {
              const body = JSON.stringify({
                DocumentTypeParams: { Document: docParam, DocumentSubType: subType },
              });
              const response = await fetch(`${this.baseUrl}/SeriesService_GetDocumentSeries`, {
                method: 'POST',
                headers: this.getHeaders(),
                body,
              });
              if (response.ok) {
                const data = await response.json();
                const found = data.value || [];
                if (found.length > 0) {
                  console.log(`✓ Series found for ${obj.name} (doc=${docParam}, subType='${subType}'): ${found.length}`);
                  series = found.map((s: any) => ({
                    ...s,
                    ObjectCode: obj.code,
                    ObjectName: obj.name,
                    DocumentSubType: subType || s.DocumentSubType || null,
                  }));
                  break;
                }
              } else {
                const errText = await response.text().catch(() => '');
                console.log(`✗ ${obj.name} doc=${docParam} sub='${subType}': ${errText.substring(0, 120)}`);
              }
            } catch (e: any) {
              // silent
            }
          }
        }
        
        if (series.length === 0) {
          console.log(`⚠ No series found for ${obj.name} (code=${obj.code}) with any combination`);
        }
        return series;
      }));

      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const s of r.value) {
            const key = `${s.Series}-${s.ObjectCode}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allSeries.push(s);
            }
          }
        }
      }
    }
    
    console.log(`Total numbering series fetched via API: ${allSeries.length}`);
    return allSeries;
  }

  // Sales Employees (OHEM)
  async getSalesEmployees(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/SalesPersons?$select=SalesEmployeeCode,SalesEmployeeName,Email,CommissionForSalesEmployee,Active`;
      console.log('Fetching sales employees from:', url);
      const data = await this.fetchJson<{ value?: any[] }>(url);
      console.log('Sales employees response count:', (data.value || []).length);
      return data.value || [];
    } catch (error) {
      console.error('Error fetching sales employees:', error);
      return [];
    }
  }

  // Distribution Rules (OOCR) - Dimensions 2-5
  async getDistributionRules(limit = 100): Promise<any[]> {
    try {
      const allItems: any[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore && allItems.length < limit) {
        const pageSize = Math.min(100, Math.max(limit - allItems.length, 1));
        const url = `${this.baseUrl}/DistributionRules?$skip=${skip}&$top=${pageSize}&$filter=InWhichDimension ge 2 and InWhichDimension le 5&$select=FactorCode,FactorDescription,InWhichDimension,Active`;
        console.log(`Fetching OOCR distribution rules skip=${skip}`);
        const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, pageSize);
        const items = Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];
        allItems.push(...items);
        const nextLink = data['odata.nextLink'] || (data as any)['@odata.nextLink'];
        hasMore = (Boolean(nextLink) || items.length >= pageSize) && items.length > 0;
        skip += items.length;
        if (items.length < pageSize) hasMore = false;
      }
      console.log('Distribution rules (OOCR dim 2-5) fetched:', allItems.length);
      return allItems.slice(0, limit);
    } catch (error) {
      console.error('Error fetching distribution rules:', error);
      return [];
    }
  }

  // Profit Centers (OPRC) - Dimension 1 (Employees)
  async getProfitCenters(limit = 100): Promise<any[]> {
    try {
      const allItems: any[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore && allItems.length < limit) {
        const pageSize = Math.min(100, Math.max(limit - allItems.length, 1));
        const url = `${this.baseUrl}/ProfitCenters?$skip=${skip}&$top=${pageSize}&$select=CenterCode,CenterName,InWhichDimension,EffectiveFrom,EffectiveTo,Active`;
        const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, pageSize);
        const items = Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];
        allItems.push(...items);
        const nextLink = data['odata.nextLink'] || (data as any)['@odata.nextLink'];
        hasMore = (Boolean(nextLink) || items.length >= pageSize) && items.length > 0;
        skip += items.length;
        if (items.length < pageSize) hasMore = false;
      }
      console.log('Profit centers (OPRC) fetched:', allItems.length);
      return allItems.slice(0, limit);
    } catch (error) {
      console.error('Error fetching profit centers:', error);
      return [];
    }
  }

  // Dimensions metadata (dimension definitions 1-5)
  async getDimensionDefinitions(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/Dimensions?$select=DimensionCode,DimensionDescription,IsActive`;
      const data = await this.fetchJson<{ value?: any[] }>(url, 30);
      const items = data.value || [];
      console.log('Dimension definitions fetched:', items.length);
      return items;
    } catch (error) {
      console.error('Error fetching dimension definitions:', error);
      return [];
    }
  }


  async getWarehouses(): Promise<any[]> {
    const parseItems = (data: any) =>
      Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];

    try {
      const allItems: any[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore) {
        let items: any[];
        try {
          const url = `${this.baseUrl}/Warehouses?$skip=${skip}&$top=100&$select=WarehouseCode,WarehouseName,Location,Inactive`;
          const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, 100);
          items = parseItems(data);
          hasMore = !!(data['odata.nextLink'] || (data as any)['@odata.nextLink']) && items.length > 0;
        } catch {
          // Fallback: no $select
          const url = `${this.baseUrl}/Warehouses?$skip=${skip}&$top=100`;
          const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, 100);
          items = parseItems(data);
          hasMore = !!(data['odata.nextLink'] || (data as any)['@odata.nextLink']) && items.length > 0;
        }
        allItems.push(...items);
        skip += items.length;
        if (items.length < 100) hasMore = false;
      }
      console.log('Warehouses fetched:', allItems.length);
      return allItems;
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }
  }

  // Price Lists (OPLN)
  async getPriceLists(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/PriceLists?$top=500&$select=PriceListNo,PriceListName,BasePriceList,Factor,DefaultPrimeCurrency,IsActive`;
      const data = await this.fetchJson<{ value?: any[] }>(url, 500);
      console.log('Price lists fetched:', (data.value || []).length);
      return data.value || [];
    } catch (error) {
      console.error('Error fetching price lists:', error);
      return [];
    }
  }

  // Sales Tax Codes (VatGroups)
  async getTaxCodes(): Promise<any[]> {
    const parseItems = (data: any) =>
      Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : [];

    try {
      // Some SAP B1 environments reject certain VatGroup fields in $select.
      // Keep this minimal and fall back to full payload if needed.
      const url = `${this.baseUrl}/VatGroups?$top=500&$select=Code,Name,Category,Inactive,VatGroups_Lines`;
      const data = await this.fetchJson<{ value?: any[] }>(url, 500);
      const items = parseItems(data);
      console.log('Tax codes fetched:', items.length);
      return items;
    } catch (error) {
      console.warn('Tax codes minimal select failed, retrying without $select:', error);
      const fallbackUrl = `${this.baseUrl}/VatGroups?$top=500`;
      const fallbackData = await this.fetchJson<{ value?: any[] }>(fallbackUrl, 500);
      const items = parseItems(fallbackData);
      console.log('Tax codes fetched (fallback):', items.length);
      return items;
    }
  }

  // Chart of Accounts (OACT) - fetch ALL accounts including title/non-postable
  async getChartOfAccounts(skip = 0, top = 2000): Promise<{ items: any[]; hasMore: boolean }> {
    // Select key fields explicitly to ensure title accounts are included
    const select = '$select=Code,Name,FatherAccountKey,AccountType,AccountLevel,Balance,ActiveAccount';
    const url = `${this.baseUrl}/ChartOfAccounts?${select}&$skip=${skip}&$top=${top}&$orderby=Code`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, top);
    const items = Array.isArray((data as any)?.value) ? (data as any).value : (Array.isArray(data as any) ? (data as any) : []);
    const hasMore = items.length >= top || !!((data as any)['odata.nextLink'] || (data as any)['@odata.nextLink']);
    if (skip === 0 && items.length > 0) {
      console.log('COA sample record keys:', JSON.stringify(Object.keys(items[0])));
      console.log('COA sample record:', JSON.stringify(items[0]));
    }
    return { items, hasMore };
  }

  async getDefaultSeries(objectType: string, cardType?: string): Promise<number | null> {
    // Try multiple object type identifiers since SAP instances vary
    const objectVariants = [objectType, 'BusinessPartners', 'oBusinessPartners'];
    const subTypeVariants = cardType ? [cardType, ''] : [''];

    for (const objType of objectVariants) {
      for (const subType of subTypeVariants) {
        // Try GetDefaultSeries
        try {
          const response = await fetch(`${this.baseUrl}/SeriesService_GetDefaultSeries`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              DocumentTypeParams: { Document: objType, DocumentSubType: subType },
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.Series) {
              console.log(`Found default series ${data.Series} for ${objType}/${subType}`);
              return data.Series;
            }
          }
          await response.text().catch(() => {});
        } catch { /* continue */ }

        // Try GetDocumentSeries
        try {
          const seriesResponse = await fetch(`${this.baseUrl}/SeriesService_GetDocumentSeries`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              DocumentTypeParams: { Document: objType, DocumentSubType: subType },
            }),
          });
          if (seriesResponse.ok) {
            const seriesData = await seriesResponse.json();
            const seriesList = seriesData.value || [];
            if (seriesList.length > 0) {
              console.log(`Found ${seriesList.length} series for ${objType}/${subType}`);
              if (cardType) {
                const prefixMatch = seriesList.find((s: any) => s.Prefix?.toUpperCase() === cardType.toUpperCase() && s.Locked !== 'tYES');
                if (prefixMatch) return prefixMatch.Series;
              }
              const defaultSeries = seriesList.find((s: any) => s.IsDefault === 'tYES');
              if (defaultSeries) return defaultSeries.Series;
              const activeSeries = seriesList.find((s: any) => s.Locked !== 'tYES');
              if (activeSeries) return activeSeries.Series;
              return seriesList[0].Series;
            }
          }
          await seriesResponse.text().catch(() => {});
        } catch { /* continue */ }
      }
    }

    console.log(`No series found for any variant of object ${objectType}, cardType ${cardType}`);
    return null;
  }

  async createBusinessPartner(bp: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const sapCardType = bp.card_type === 'customer' ? 'cCustomer' : bp.card_type === 'vendor' ? 'cSupplier' : 'cLid';
      
      const payload: any = {
        CardName: bp.card_name,
        CardType: sapCardType,
        Phone1: bp.phone,
        Phone2: bp.mobile,
        EmailAddress: bp.email,
        BillToState: bp.billing_address,
        ShipToState: bp.shipping_address,
        CreditLimit: bp.credit_limit,
        Currency: bp.currency,
        CardForeignName: bp.card_foreign_name || undefined,
        FederalTaxID: bp.vat_reg_num || undefined,
        GroupCode: bp.group_code ? parseInt(bp.group_code) : undefined,
        Fax: bp.fax || undefined,
        Notes: bp.notes || undefined,
        FreeText: bp.free_text || undefined,
        AliasName: bp.alias_name || undefined,
        Industry: bp.industry ? parseInt(bp.industry) : undefined,
        Territory: bp.territory ? parseInt(bp.territory) : undefined,
        OwnerCode: bp.owner_code || undefined,
      };

      // Add contact person as ContactEmployees array if provided
      if (bp.contact_person) {
        payload.ContactEmployees = [{ Name: bp.contact_person }];
        payload.ContactPerson = bp.contact_person;
      }

      // Use manual numbering — pass the CardCode directly from local DB
      payload.CardCode = bp.card_code;

      // Remove undefined values
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/BusinessPartners`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      if (!response.ok) {
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateBusinessPartner(cardCode: string, bp: any): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {
        CardName: bp.card_name,
        Phone1: bp.phone,
        Phone2: bp.mobile,
        EmailAddress: bp.email,
        BillToState: bp.billing_address,
        ShipToState: bp.shipping_address,
        CreditLimit: bp.credit_limit,
        CardForeignName: bp.card_foreign_name || undefined,
        FederalTaxID: bp.vat_reg_num || undefined,
        GroupCode: bp.group_code ? parseInt(bp.group_code) : undefined,
        Fax: bp.fax || undefined,
        Notes: bp.notes || undefined,
        FreeText: bp.free_text || undefined,
        AliasName: bp.alias_name || undefined,
        Industry: bp.industry ? parseInt(bp.industry) : undefined,
        Territory: bp.territory ? parseInt(bp.territory) : undefined,
        OwnerCode: bp.owner_code || undefined,
      };

      // Only fetch existing contacts from SAP if contact_person is provided
      // Skip this expensive lookup if contact_person is empty
      if (bp.contact_person) {
        payload.ContactPerson = bp.contact_person;
        // Only fetch contacts if we actually need to add one — use a quick PATCH first
        // If it fails due to missing contact, then fetch and add
        try {
          const testPayload = { ...payload };
          Object.keys(testPayload).forEach(k => testPayload[k] === undefined && delete testPayload[k]);
          const testResponse = await fetch(`${this.baseUrl}/BusinessPartners('${cardCode}')`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(testPayload),
          });
          if (testResponse.ok) {
            return { success: true };
          }
          const testText = await testResponse.text();
          // If error is about contact person, fetch contacts and retry
          if (testText.includes('ContactPerson') || testText.includes('contact')) {
            const existingBP = await this.fetchJson<any>(`${this.baseUrl}/BusinessPartners('${cardCode}')?$select=ContactEmployees`);
            const existingContacts = existingBP.ContactEmployees || [];
            const contactExists = existingContacts.some((c: any) => c.Name === bp.contact_person);
            if (!contactExists) {
              payload.ContactEmployees = [...existingContacts, { Name: bp.contact_person }];
            }
          } else {
            return { success: false, error: this.parseSAPError(testText) };
          }
        } catch (e) {
          payload.ContactEmployees = [{ Name: bp.contact_person }];
        }
      }

      // Remove undefined values
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/BusinessPartners('${cardCode}')`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Items - exclude Fixed Assets at API level
  async getItems(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = `$filter=ItemType ne 'itFixedAssets'`;
    if (updatedAfter) {
      filter += ` and UpdateDate ge '${updatedAfter}'`;
    }
    const url = `${this.baseUrl}/Items?${filter}&$skip=${skip}&$top=${top}&$orderby=CreateDate desc&$select=ItemCode,ItemName,ItemType,InventoryItem,SalesItem,PurchaseItem,QuantityOnStock,QuantityOrderedByCustomers,QuantityOrderedFromVendors,DefaultWarehouse,BarCode,Manufacturer`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string }>(url, top);
    const items = Array.isArray((data as any)?.value) ? (data as any).value : Array.isArray(data as any) ? (data as any) : [];
    const hasMore = !!((data as any)['odata.nextLink'] || (data as any)['@odata.nextLink']) || items.length >= top;
    return { items, hasMore };
  }

  // Get warehouse-specific stock for a single item
  async getItemWarehouseInfo(itemCode: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/Items('${encodeURIComponent(itemCode)}')/ItemWarehouseInfoCollection`;
      const data = await this.fetchJson<{ value?: any[] }>(url, 100);
      return Array.isArray((data as any)?.value) ? (data as any).value : Array.isArray(data) ? (data as any) : [];
    } catch {
      return [];
    }
  }

  async createItem(item: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const isInventory = item.item_type === 'inventory';
      const payload: any = {
        ItemCode: item.item_code,
        ItemName: item.description,
        ItemType: isInventory ? 'itItems' : 'itLabor',
        InventoryItem: isInventory ? 'tYES' : 'tNO',
        SalesItem: 'tYES',
        PurchaseItem: 'tYES',
      };

      // Only set warehouse for inventory items and when value exists
      if (isInventory && item.warehouse) {
        payload.DefaultWarehouse = item.warehouse;
      }
      if (item.barcode) {
        payload.BarCode = item.barcode;
      }
      // Manufacturer must be a valid integer code (not "-1" or null)
      if (item.manufacturer && item.manufacturer !== '-1' && item.manufacturer !== -1) {
        payload.Manufacturer = parseInt(item.manufacturer);
        if (isNaN(payload.Manufacturer)) delete payload.Manufacturer;
      }

      console.log('Creating item in SAP:', JSON.stringify(payload));

      const response = await fetch(`${this.baseUrl}/Items`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      if (!response.ok) {
        console.error('SAP create item error response:', text.slice(0, 500));
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateItem(itemCode: string, item: any): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {
        ItemName: item.description,
      };
      if (item.warehouse) payload.DefaultWarehouse = item.warehouse;
      if (item.barcode) payload.BarCode = item.barcode;
      if (item.manufacturer && item.manufacturer !== '-1' && item.manufacturer !== -1) {
        payload.Manufacturer = parseInt(item.manufacturer);
        if (isNaN(payload.Manufacturer)) delete payload.Manufacturer;
      }

      const response = await fetch(`${this.baseUrl}/Items('${itemCode}')`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      await response.text();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ========== Opportunities (SalesOpportunities) ==========
  async getOpportunities(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/SalesOpportunities?${filter}$skip=${skip}&$top=${top}&$orderby=StartDate desc&$select=SequentialNo,OpportunityName,CardCode,CardName,SalesEmployee,StartDate,ClosingDate,Status,MaxLocalTotal,WeightedAmountLocal,CurrentStageNo,Source,InterestField,Territory,Industry,ClosingType,Reason,ProjectCode,Remarks,ContactPerson`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createOpportunity(opp: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        OpportunityName: opp.name,
        CardCode: opp.customer_code,
        StartDate: opp.start_date || opp.created_at?.split('T')[0],
        ClosingDate: opp.expected_close,
        MaxLocalTotal: opp.value || opp.max_local_total || 0,
        Remarks: opp.remarks || opp.notes,
        SalesEmployee: opp.sales_employee_code,
        Source: opp.source,
        InterestField: opp.interest_field,
        Territory: opp.territory,
        Industry: opp.industry,
        ProjectCode: opp.project_code,
        ContactPerson: opp.contact_person,
      };
      Object.keys(payload).forEach(k => (payload[k] === undefined || payload[k] === null) && delete payload[k]);

      console.log('Creating opportunity in SAP:', JSON.stringify(payload));
      const response = await fetch(`${this.baseUrl}/SalesOpportunities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error('SAP create opportunity error:', text.slice(0, 500));
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateOpportunity(seqNo: number, opp: any): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {
        OpportunityName: opp.name,
        MaxLocalTotal: opp.value || opp.max_local_total,
        Remarks: opp.remarks || opp.notes,
        ClosingDate: opp.expected_close,
        SalesEmployee: opp.sales_employee_code,
        Source: opp.source,
        InterestField: opp.interest_field,
        Territory: opp.territory,
        Industry: opp.industry,
        ProjectCode: opp.project_code,
        ContactPerson: opp.contact_person,
      };
      Object.keys(payload).forEach(k => (payload[k] === undefined || payload[k] === null) && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/SalesOpportunities(${seqNo})`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      await response.text();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ========== Activities ==========
  async getActivities(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=ActivityDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/Activities?${filter}$skip=${skip}&$top=${top}&$orderby=ActivityDate desc&$select=ActivityCode,Activity,ActivityType,ActivityDate,ActivityTime,CardCode,Details,Notes,Subject,Priority,StartDate,Duration,DurationType,DocEntry,DocType,Location,SalesEmployee,ContactPersonCode,StartTime,EndTime`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createActivity(act: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Map CRM type to SAP activity action (single-char enum)
      const actionMap: Record<string, string> = {
        'call': 'C', 'phone_call': 'C',
        'meeting': 'M',
        'task': 'T',
        'note': 'E',
        'email': 'N',
        'other': 'N',
      };
      const priorityMap: Record<string, string> = {
        'low': 'pr_Low', 'normal': 'pr_Normal', 'medium': 'pr_Normal', 'high': 'pr_High',
      };

      const payload: any = {
        Activity: actionMap[act.type?.toLowerCase()] || 'C',
        Subject: -1,
        Notes: [act.subject, act.description].filter(Boolean).join(' - '),
        ActivityDate: act.due_date?.split('T')[0] || act.created_at?.split('T')[0],
        CardCode: act.card_code,
        Priority: priorityMap[act.priority?.toLowerCase()] || 'pr_Normal',
        Duration: act.duration,
        DurationType: act.duration_type || 'du_Minuts',
        Location: act.location,
        SalesEmployee: act.sales_employee_code,
        ContactPersonCode: act.contact_person_code,
      };
      Object.keys(payload).forEach(k => (payload[k] === undefined || payload[k] === null) && delete payload[k]);

      console.log('Creating activity in SAP:', JSON.stringify(payload));
      const response = await fetch(`${this.baseUrl}/Activities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        console.error('SAP create activity error:', text.slice(0, 500));
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateActivity(activityCode: number, act: any): Promise<{ success: boolean; error?: string }> {
    try {
      const priorityMap: Record<string, string> = {
        'low': 'pr_Low', 'normal': 'pr_Normal', 'medium': 'pr_Normal', 'high': 'pr_High',
      };
      const payload: any = {
        Notes: [act.subject, act.description].filter(Boolean).join(' - ') || undefined,
        Priority: priorityMap[act.priority?.toLowerCase()] || undefined,
        Duration: act.duration,
        Location: act.location,
      };
      Object.keys(payload).forEach(k => (payload[k] === undefined || payload[k] === null) && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/Activities(${activityCode})`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      await response.text();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Sales Quotations (OQUT)
  async getQuotations(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/Quotations?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines,ContactPersonCode,Address,Address2,DiscountPercent,VatSum,SalesPersonCode,PaymentGroupCode,NumAtCard`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createQuotation(quote: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: quote.customer_code,
        DocDate: quote.doc_date || new Date().toISOString().split('T')[0],
        DocDueDate: quote.valid_until,
        Comments: quote.notes,
        DocCurrency: quote.currency || 'SAR',
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemDescription: line.description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price,
            DiscountPercent: line.discount_percent || 0,
          };
          if (line.item_code && !line._no_item_code) l.ItemCode = line.item_code;
          if (line.warehouse) l.WarehouseCode = line.warehouse;
          if (line.tax_code) l.TaxCode = line.tax_code;
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (quote.contact_person) payload.ContactPersonCode = parseInt(quote.contact_person) || undefined;
      if (quote.sales_employee_code) payload.SalesPersonCode = quote.sales_employee_code;
      if (quote.billing_address) payload.Address = quote.billing_address;
      if (quote.shipping_address) payload.Address2 = quote.shipping_address;
      if (quote.payment_terms) payload.PaymentGroupCode = parseInt(quote.payment_terms) || undefined;
      if (quote.num_at_card) payload.NumAtCard = quote.num_at_card;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/Quotations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateQuotation(docEntry: string, quote: any): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {
        Comments: quote.notes,
      };
      if (quote.valid_until) payload.DocDueDate = quote.valid_until;
      if (quote.contact_person) payload.ContactPersonCode = parseInt(quote.contact_person) || undefined;
      if (quote.sales_employee_code) payload.SalesPersonCode = quote.sales_employee_code;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/Quotations(${docEntry})`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }


  async getSalesOrders(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/Orders?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines,ContactPersonCode,Address,Address2,DiscountPercent,VatSum,SalesPersonCode,PaymentGroupCode`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createSalesOrder(order: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Build document lines, handling items that may not exist in SAP
      const documentLines = lines.map((line, idx) => {
        const docLine: any = {
          LineNum: idx,
          ItemDescription: line.description,
          Quantity: parseFloat(line.quantity) || 1,
          UnitPrice: parseFloat(line.unit_price) || 0,
        };
        // Only include ItemCode if it exists and is not empty
        if (line.item_code && String(line.item_code).trim()) {
          docLine.ItemCode = String(line.item_code).trim();
        }
        if (line.discount_percent) docLine.DiscountPercent = parseFloat(line.discount_percent);
        if (line.warehouse) docLine.WarehouseCode = line.warehouse;
        if (line.tax_code) docLine.TaxCode = line.tax_code;
        // Add dimension cost centers
        if (line._costing_code) docLine.CostingCode = line._costing_code;
        if (line._costing_code2) docLine.CostingCode2 = line._costing_code2;
        if (line._costing_code3) docLine.CostingCode3 = line._costing_code3;
        if (line._costing_code4) docLine.CostingCode4 = line._costing_code4;
        return docLine;
      });

      const payload: any = {
        CardCode: order.customer_code,
        DocDate: order.doc_date,
        DocDueDate: order.due_date,
        DocCurrency: order.currency || 'SAR',
        DocumentLines: documentLines,
      };
      if (order.remarks) payload.Comments = order.remarks;
      if (order.sales_employee_code) payload.SalesPersonCode = order.sales_employee_code;
      if (order.num_at_card) payload.NumAtCard = order.num_at_card;
      if (order.series) payload.Series = order.series;

      console.log('Creating SAP Sales Order payload:', JSON.stringify(payload).slice(0, 1500));

      const response = await fetch(`${this.baseUrl}/Orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      if (!response.ok) {
        const errorMsg = this.parseSAPError(text);
        console.error('SAP Create Sales Order failed:', errorMsg);
        
        // If item not found, try again without ItemCode (use description-only lines)
        if (errorMsg.includes('no matching record') || errorMsg.includes('-2028')) {
          console.log('Retrying without ItemCode (description-only lines)...');
          const fallbackLines = documentLines.map(l => {
            const { ItemCode, ...rest } = l;
            return rest;
          });
          payload.DocumentLines = fallbackLines;
          
          const retryResponse = await fetch(`${this.baseUrl}/Orders`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
          });
          const retryText = await retryResponse.text();
          if (!retryResponse.ok) {
            return { success: false, error: this.parseSAPError(retryText) };
          }
          return { success: true, data: retryText ? JSON.parse(retryText) : {} };
        }
        
        return { success: false, error: errorMsg };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // AR Invoices
  async getARInvoices(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/Invoices?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,NumAtCard,PaymentGroupCode,ShipToCode,PayToCode,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createARInvoice(invoice: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: invoice.customer_code,
        DocDate: invoice.doc_date,
        DocDueDate: invoice.doc_due_date,
        Comments: invoice.remarks,
        DocCurrency: invoice.currency,
        NumAtCard: invoice.num_at_card,
        DocumentLines: lines.map((line, idx) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price,
            DiscountPercent: line.discount_percent,
            WarehouseCode: line.warehouse,
            TaxCode: line.tax_code,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (invoice.series) payload.Series = invoice.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/Invoices`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      if (!response.ok) {
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Incoming Payments
  async getIncomingPayments(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/IncomingPayments?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Remarks,CashSum,CheckAccount,TransferSum,PaymentInvoices`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createIncomingPayment(payment: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const normalizeDate = (value?: string | null) => (value ? String(value).split('T')[0] : undefined);
      const docDate = normalizeDate(payment.doc_date) || new Date().toISOString().split('T')[0];
      const dueDate = normalizeDate(payment.due_date);

      const paymentData: any = {
        CardCode: payment.customer_code,
        DocDate: docDate,
        Remarks: payment.remarks,
        DocCurrency: payment.currency || 'SAR',
      };

      if (dueDate) {
        paymentData.DocDueDate = dueDate;
      }

      if (payment.payment_type === 'cash') {
        paymentData.CashSum = payment.total_amount;
        paymentData.CashAccount = payment.cash_account || payment.bank_account || undefined;
      } else if (payment.payment_type === 'check') {
        paymentData.PaymentChecks = [{
          CheckSum: payment.total_amount,
          BankCode: payment.bank_code,
          CheckNumber: payment.check_number,
          DueDate: normalizeDate(payment.check_date),
        }];
      } else if (payment.payment_type === 'bank_transfer') {
        paymentData.TransferSum = payment.total_amount;
        paymentData.TransferAccount = payment.transfer_account || payment.bank_account;
      } else if (payment.payment_type === 'credit_card') {
        paymentData.PaymentCreditCards = [{
          CreditSum: payment.total_amount,
          CreditCard: payment.credit_card_type,
          CreditCardNumber: payment.credit_card_number,
          VoucherNum: payment.voucher_number,
        }];
      }

      const postPayment = async (payload: any): Promise<{ success: boolean; data?: any; error?: string }> => {
        const response = await fetch(`${this.baseUrl}/IncomingPayments`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        if (!response.ok) {
          return { success: false, error: this.parseSAPError(text) };
        }
        return { success: true, data: text ? JSON.parse(text) : {} };
      };

      let result = await postPayment(paymentData);

      // SAP B1 variants: some instances reject DocDueDate for IncomingPayments payloads
      if (!result.success && result.error?.includes("Property 'DocDueDate' of 'Payment' is invalid") && dueDate) {
        const fallbackPayload = { ...paymentData, DueDate: dueDate };
        delete fallbackPayload.DocDueDate;
        result = await postPayment(fallbackPayload);
      }

      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Purchase Requests (SAP: PurchaseRequests)
  async getPurchaseRequests(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/PurchaseRequests?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,RequesterName,RequesterDepartment,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createPurchaseRequest(pr: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        DocDate: pr.doc_date,
        ReqDate: pr.required_date,
        Comments: pr.remarks,
        RequesterName: pr.requester_name,
        RequesterDepartment: pr.department ? parseInt(pr.department) || undefined : undefined,
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price || 0,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (pr.series) payload.Series = pr.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/PurchaseRequests`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Purchase Quotations (SAP: PurchaseQuotations)
  async getPurchaseQuotations(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/PurchaseQuotations?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createPurchaseQuotation(pq: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: pq.vendor_code,
        DocDate: pq.doc_date,
        DocDueDate: pq.valid_until,
        Comments: pq.remarks,
        DocCurrency: pq.currency,
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price || 0,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (pq.series) payload.Series = pq.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/PurchaseQuotations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Purchase Orders (SAP: PurchaseOrders)
  async getPurchaseOrders(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/PurchaseOrders?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createPurchaseOrder(po: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: po.vendor_code,
        DocDate: po.doc_date,
        DocDueDate: po.delivery_date,
        Comments: po.remarks,
        DocCurrency: po.currency,
        ShipToCode: po.shipping_address,
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price || 0,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (po.series) payload.Series = po.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/PurchaseOrders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Goods Receipt PO (SAP: PurchaseDeliveryNotes)
  async getGoodsReceipts(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/PurchaseDeliveryNotes?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createGoodsReceipt(gr: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: gr.vendor_code,
        DocDate: gr.doc_date,
        Comments: gr.remarks,
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description,
            Quantity: line.received_quantity || line.quantity,
            UnitPrice: line.unit_price || 0,
            WarehouseCode: gr.warehouse || line.warehouse,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (gr.series) payload.Series = gr.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/PurchaseDeliveryNotes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // AP Invoices (SAP: PurchaseInvoices)
  async getAPInvoices(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/PurchaseInvoices?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createAPInvoice(inv: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: inv.vendor_code,
        DocDate: inv.doc_date,
        DocDueDate: inv.doc_due_date,
        Comments: inv.remarks,
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price || 0,
          };
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (inv.series) payload.Series = inv.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/PurchaseInvoices`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: this.parseSAPError(text) };
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delivery Notes (SAP: DeliveryNotes)
  async getDeliveryNotes(skip = 0, top = 100, updatedAfter?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (updatedAfter) {
      filter = `$filter=UpdateDate ge '${updatedAfter}'&`;
    }
    const url = `${this.baseUrl}/DeliveryNotes?${filter}$skip=${skip}&$top=${top}&$orderby=DocDate desc,DocEntry desc&$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,Comments,DocumentLines,Address,Address2,SalesPersonCode`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string }>(url, top);
    return { items: data.value || [], hasMore: !!data['odata.nextLink'] };
  }

  async createDeliveryNote(dn: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        CardCode: dn.customer_code,
        DocDate: dn.doc_date,
        DocDueDate: dn.due_date,
        Comments: dn.remarks,
        DocCurrency: dn.currency || 'SAR',
        DocumentLines: lines.map((line: any, idx: number) => {
          const l: any = {
            LineNum: idx,
            ItemCode: line.item_code,
            ItemDescription: line.item_description || line.description,
            Quantity: line.quantity,
            UnitPrice: line.unit_price || 0,
          };
          if (line.warehouse) l.WarehouseCode = line.warehouse;
          if (line.tax_code) l.TaxCode = line.tax_code;
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          return l;
        }),
      };
      if (dn.series) payload.Series = dn.series;
      if (dn.sales_employee_code) payload.SalesPersonCode = dn.sales_employee_code;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/DeliveryNotes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        const errorMsg = this.parseSAPError(text);
        if (errorMsg.includes('no matching record') || errorMsg.includes('-2028')) {
          const fallbackLines = payload.DocumentLines.map((l: any) => { const { ItemCode, ...rest } = l; return rest; });
          payload.DocumentLines = fallbackLines;
          const retryResponse = await fetch(`${this.baseUrl}/DeliveryNotes`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(payload) });
          const retryText = await retryResponse.text();
          if (!retryResponse.ok) return { success: false, error: this.parseSAPError(retryText) };
          return { success: true, data: retryText ? JSON.parse(retryText) : {} };
        }
        return { success: false, error: errorMsg };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Generic GET for any SAP endpoint
  async get(path: string, select?: string): Promise<any> {
    const url = select ? `${this.baseUrl}${path}?$select=${select}` : `${this.baseUrl}${path}`;
    return this.fetchJson<any>(url);
  }

  // Generic PATCH for any SAP endpoint
  async patch(path: string, payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: this.parseSAPError(text) };
      }
      await response.text();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Journal Entries
  async getJournalEntries(skip = 0, top = 100, dateFrom?: string, dateTo?: string): Promise<{ items: any[]; hasMore: boolean }> {
    let filter = '';
    if (dateFrom && dateTo) {
      filter = `&$filter=ReferenceDate ge '${dateFrom}' and ReferenceDate le '${dateTo}'`;
    } else if (dateFrom) {
      filter = `&$filter=ReferenceDate ge '${dateFrom}'`;
    } else if (dateTo) {
      filter = `&$filter=ReferenceDate le '${dateTo}'`;
    }
    const url = `${this.baseUrl}/JournalEntries?$skip=${skip}&$top=${top}&$orderby=ReferenceDate desc,JdtNum desc&$select=JdtNum,Number,ReferenceDate,DueDate,Memo,Reference,JournalEntryLines${filter}`;
    const data = await this.fetchJson<{ value?: any[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string; __next?: string }>(url, top);
    const items = data.value || [];
    const nextLink = data['@odata.nextLink'] || data['odata.nextLink'] || data.__next;
    return {
      items,
      hasMore: !!nextLink || items.length === top,
    };
  }

  async createJournalEntry(je: any, lines: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payload: any = {
        ReferenceDate: je.posting_date,
        DueDate: je.due_date || je.posting_date,
        Memo: je.memo || '',
        Reference: je.reference || '',
        JournalEntryLines: lines.map((line: any, idx: number) => {
          const l: any = {
            Line_ID: idx,
            AccountCode: line.acct_code,
            Debit: line.debit || 0,
            Credit: line.credit || 0,
            LineMemo: line.remarks || '',
            ShortName: line.bp_code || line.acct_code,
          };
          if (line.cost_center) l.CostingCode = line.cost_center;
          if (line._costing_code) l.CostingCode = line._costing_code;
          if (line._costing_code2) l.CostingCode2 = line._costing_code2;
          if (line._costing_code3) l.CostingCode3 = line._costing_code3;
          if (line._costing_code4) l.CostingCode4 = line._costing_code4;
          if (line.project_code) l.ProjectCode = line.project_code;
          return l;
        }),
      };
      if (je.series) payload.Series = je.series;
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const response = await fetch(`${this.baseUrl}/JournalEntries`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        return { success: false, error: this.parseSAPError(text) };
      }
      return { success: true, data: text ? JSON.parse(text) : {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
// Compare and detect conflicts
function detectConflicts(crmData: any, sapData: any, fieldMappings: Record<string, string>): Array<{ field: string; crm: any; sap: any }> {
  const conflicts: Array<{ field: string; crm: any; sap: any }> = [];
  
  for (const [crmField, sapField] of Object.entries(fieldMappings)) {
    const crmValue = crmData[crmField];
    const sapValue = sapData[sapField];
    
    if (!crmValue && !sapValue) continue;
    
    if (String(crmValue || '').trim() !== String(sapValue || '').trim()) {
      conflicts.push({ field: crmField, crm: crmValue, sap: sapValue });
    }
  }
  
  return conflicts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = user.id;

    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'manager', 'sales_rep']);

    if (rolesError || !userRoles || userRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Sales rep, manager, or admin role required.' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, entity, direction, entityId, limit = 100, company_id: reqCompanyId, dateFrom, dateTo, skip = 0, deltaSync = false } = await req.json();

    // Load SAP settings: prefer user's active company, fallback to sap_connection_settings, then env vars
    let sapSettings: { service_layer_url: string; company_db: string; username: string; password: string } | null = null;

    // 1. Check user's active company
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('active_company_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (userProfile?.active_company_id) {
      const { data: companyData } = await supabaseAdmin
        .from('sap_companies')
        .select('service_layer_url, database_name, username, password')
        .eq('id', userProfile.active_company_id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (companyData) {
        sapSettings = {
          service_layer_url: companyData.service_layer_url,
          company_db: companyData.database_name,
          username: companyData.username,
          password: companyData.password,
        };
        console.log(`SAP settings source: active company (${companyData.database_name})`);
      }
    }

    // Determine the company_id to stamp on synced records
    const activeCompanyId = reqCompanyId || userProfile?.active_company_id || null;
    console.log(`Active company_id for sync: ${activeCompanyId}`);

    // 2. Fallback to sap_connection_settings
    if (!sapSettings) {
      const { data: dbSettings } = await supabaseAdmin
        .from('sap_connection_settings')
        .select('service_layer_url, company_db, username, password')
        .limit(1)
        .maybeSingle();
      
      if (dbSettings && dbSettings.service_layer_url) {
        sapSettings = dbSettings;
        console.log('SAP settings source: sap_connection_settings table');
      } else {
        console.log('SAP settings source: environment variables');
      }
    }

    const sapClient = new SAPB1Client(sapSettings || undefined);
    const loggedIn = await sapClient.login();
    
    if (!loggedIn) {
      const settingsSource = sapSettings ? 'saved company settings' : 'env vars';
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to connect to SAP B1 (using ${settingsSource}). Please check your credentials and SAP server availability.`,
        pushResults: []
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let result: any = { success: false, pushResults: [] };

    try {
      if (action === 'sync') {
        const jobStartTime = Date.now();
        
        const { data: syncLog } = await supabaseAdmin
          .from('sync_logs')
          .insert({
            entity_type: entity,
            entity_id: entityId || '00000000-0000-0000-0000-000000000000',
            direction: direction,
            status: 'pending',
            created_by: userId,
          })
          .select()
          .single();

        // Create a sync_jobs record for the control center
        const jobNumber = `JOB-${Date.now()}`;
        const { data: syncJob } = await supabaseAdmin
          .from('sync_jobs')
          .insert({
            job_number: jobNumber,
            entity_name: entity,
            company_id: activeCompanyId,
            direction: direction || 'from_sap',
            job_type: deltaSync ? 'incremental' : 'full',
            status: 'running',
            triggered_by: userId,
            trigger_type: 'manual',
            started_at: new Date().toISOString(),
            filters: { entityId, dateFrom, dateTo, deltaSync, limit },
          })
          .select()
          .single();

        // Create extract stage
        const extractStart = Date.now();
        if (syncJob) {
          await supabaseAdmin.from('sync_job_stages').insert({
            job_id: syncJob.id,
            stage_name: 'extract',
            status: 'running',
            started_at: new Date().toISOString(),
          });
        }

        const recordLimit = Math.max(parseInt(limit) || 100, 1);

        // Delta sync: look up last successful sync timestamp for this entity
        let updatedAfter: string | undefined;
        if (deltaSync && direction !== 'to_sap') {
          // First check sync_watermarks, then fall back to sync_logs
          const { data: watermark } = await supabaseAdmin
            .from('sync_watermarks')
            .select('watermark_value')
            .eq('entity_name', entity)
            .eq('company_id', activeCompanyId || '00000000-0000-0000-0000-000000000000')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (watermark?.watermark_value) {
            const lastDate = new Date(watermark.watermark_value);
            lastDate.setDate(lastDate.getDate() - 1);
            updatedAfter = lastDate.toISOString().split('T')[0];
            console.log(`Delta sync from watermark for ${entity}: ${updatedAfter}`);
          } else {
            const { data: lastSuccessSync } = await supabaseAdmin
              .from('sync_logs')
              .select('completed_at')
              .eq('entity_type', entity)
              .eq('status', 'synced')
              .not('completed_at', 'is', null)
              .order('completed_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastSuccessSync?.completed_at) {
              const lastDate = new Date(lastSuccessSync.completed_at);
              lastDate.setDate(lastDate.getDate() - 1);
              updatedAfter = lastDate.toISOString().split('T')[0];
              console.log(`Delta sync from sync_logs for ${entity}: ${updatedAfter}`);
            } else {
              console.log(`Delta sync requested for ${entity} but no previous sync found, doing full sync`);
            }
          }
        }
        
        if (entity === 'business_partner') {
          result = await syncBusinessPartners(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'item') {
          const [{ data: profile }, { data: userDefaults }] = await Promise.all([
            supabaseAdmin
              .from('profiles')
              .select('default_branch_id')
              .eq('user_id', userId)
              .maybeSingle(),
            supabaseAdmin
              .from('user_defaults')
              .select('default_branch_id, default_warehouse')
              .eq('user_id', userId)
              .maybeSingle(),
          ]);

          let resolvedBranchId = profile?.default_branch_id || userDefaults?.default_branch_id || null;
          let defaultWarehouse = userDefaults?.default_warehouse || null;

          if (!resolvedBranchId && userId) {
            const { data: assignment } = await supabaseAdmin
              .from('user_branch_assignments')
              .select('branch_id')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
            if (assignment?.branch_id) {
              resolvedBranchId = assignment.branch_id;
            }
          }

          if (resolvedBranchId) {
            const { data: branch } = await supabaseAdmin
              .from('branches')
              .select('code')
              .eq('id', resolvedBranchId)
              .maybeSingle();

            if (branch?.code) {
              defaultWarehouse = branch.code;
            }
          }

          console.log('Resolved default warehouse for item sync:', defaultWarehouse || 'none');
          result = await syncItems(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, defaultWarehouse, updatedAfter);
        } else if (entity === 'sales_order') {
          result = await syncSalesOrders(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'incoming_payment') {
          result = await syncIncomingPayments(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'ar_invoice') {
          result = await syncARInvoices(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'purchase_request') {
          result = await syncPurchaseRequests(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'purchase_quotation') {
          result = await syncPurchaseQuotations(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'purchase_order') {
          result = await syncPurchaseOrdersDocs(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'goods_receipt') {
          result = await syncGoodsReceipts(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'ap_invoice_payable') {
          result = await syncAPInvoicesPayable(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'numbering_series') {
          result = await syncNumberingSeries(supabaseAdmin, sapClient);
        } else if (entity === 'sales_employee') {
          result = await syncSalesEmployees(supabaseAdmin, sapClient);
        } else if (entity === 'opportunity') {
          result = await syncOpportunities(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'activity') {
          result = await syncActivities(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'quote') {
          result = await syncQuotes(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, updatedAfter);
        } else if (entity === 'dimension') {
          result = await syncDimensions(supabaseAdmin, sapClient, direction, userId, activeCompanyId);
        } else if (entity === 'cost_center') {
          result = await syncCostCenters(supabaseAdmin, sapClient, direction, userId, activeCompanyId, recordLimit);
        } else if (entity === 'distribution_rule') {
          result = await syncDistributionRules(supabaseAdmin, sapClient, direction, userId, activeCompanyId, recordLimit);
        } else if (entity === 'dimension_levels') {
          result = await syncDimensionLevels(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'payment_means') {
          result = await syncPaymentMeansAccounts(supabaseAdmin, sapClient);
        } else if (entity === 'warehouse') {
          result = await syncWarehouses(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'price_list') {
          result = await syncPriceLists(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'tax_code') {
          result = await syncTaxCodes(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'chart_of_accounts') {
          result = await syncChartOfAccounts(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'fixed_asset') {
          result = await syncFixedAssets(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId);
        } else if (entity === 'service_order') {
          result = await syncServiceOrders(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit);
        } else if (entity === 'service_contract') {
          result = await syncServiceContracts(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit);
        } else if (entity === 'service_equipment') {
          result = await syncServiceEquipment(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit);
        } else if (entity === 'pm_plan') {
          result = await syncPMPlans(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit);
        } else if (entity === 'warranty_claim') {
          result = await syncWarrantyClaims(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit);
        } else if (entity === 'delivery_note') {
          result = await syncDeliveryNotes(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId);
        } else if (entity === 'user_defaults') {
          result = await syncUserDefaults(supabaseAdmin, sapClient, direction, userId);
        } else if (entity === 'sap_user') {
          result = await syncSAPUsers(supabaseAdmin, sapClient, direction, userId, recordLimit);
        } else if (entity === 'budget') {
          result = await syncBudgets(supabaseAdmin, sapClient, direction, userId, recordLimit, activeCompanyId);
        } else if (entity === 'branch') {
          result = await syncBranches(supabaseAdmin, sapClient, activeCompanyId);
        } else if (entity === 'journal_entry') {
          result = await syncJournalEntries(supabaseAdmin, sapClient, direction, entityId, userId, recordLimit, activeCompanyId, dateFrom, dateTo, skip);
        }

        const jobEndTime = Date.now();
        const durationMs = jobEndTime - jobStartTime;

        // Build detailed error message from push results
        const failedPushes = (result.pushResults || []).filter((r: PushResult) => !r.success);
        const errorDetails = failedPushes.length > 0 
          ? failedPushes.map((r: PushResult) => `${r.entityCode}: ${r.error}`).join(' | ')
          : result.error || null;

        // Log errors to sync_error_logs table
        if (failedPushes.length > 0) {
          for (const failed of failedPushes) {
            await supabaseAdmin.from('sync_error_logs').insert({
              entity_type: entity,
              entity_id: failed.entityId,
              entity_code: failed.entityCode,
              direction: direction || 'from_sap',
              error_message: failed.error || 'Unknown error',
              error_details: { sapDocEntry: failed.sapDocEntry },
            });
          }
        } else if (!result.success && result.error) {
          await supabaseAdmin.from('sync_error_logs').insert({
            entity_type: entity,
            entity_code: entityId || null,
            direction: direction || 'from_sap',
            error_message: result.error,
          });
        }

        if (syncLog) {
          await supabaseAdmin
            .from('sync_logs')
            .update({
              status: failedPushes.length > 0 ? 'error' : (result.conflicts?.length > 0 ? 'conflict' : (result.success ? 'synced' : 'error')),
              completed_at: new Date().toISOString(),
              error_message: errorDetails,
            })
            .eq('id', syncLog.id);
        }

        // Update sync_jobs record with results
        const jobStatus = failedPushes.length > 0 ? 'completed_with_errors' : (result.success ? 'completed' : 'failed');
        if (syncJob) {
          await supabaseAdmin
            .from('sync_jobs')
            .update({
              status: jobStatus,
              records_fetched: (result.synced || 0) + (result.created || 0) + failedPushes.length,
              records_inserted: result.created || 0,
              records_updated: result.synced || 0,
              records_failed: failedPushes.length,
              watermark_after: updatedAfter || null,
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              error_summary: errorDetails,
            })
            .eq('id', syncJob.id);

          // Update extract stage
          await supabaseAdmin
            .from('sync_job_stages')
            .update({
              status: result.success ? 'completed' : 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              records_processed: (result.synced || 0) + (result.created || 0),
              records_failed: failedPushes.length,
              error_message: errorDetails,
            })
            .eq('job_id', syncJob.id)
            .eq('stage_name', 'extract');
        }

        // Save watermark on success
        if (result.success && !result.hasMore) {
          const watermarkValue = new Date().toISOString();
          await supabaseAdmin.from('sync_watermarks').insert({
            entity_name: entity,
            company_id: activeCompanyId || '00000000-0000-0000-0000-000000000000',
            watermark_value: watermarkValue,
            watermark_type: 'timestamp',
            job_id: syncJob?.id,
            records_synced: (result.synced || 0) + (result.created || 0),
          });
        }

        // Log performance metrics
        if (syncJob) {
          await supabaseAdmin.from('sync_performance_log').insert({
            job_id: syncJob.id,
            entity_name: entity,
            company_id: activeCompanyId,
            duration_ms: durationMs,
            records_processed: (result.synced || 0) + (result.created || 0),
            records_failed: failedPushes.length,
            api_response_time_ms: Math.round(durationMs * 0.7), // Approximate: 70% is API time
            throughput_per_minute: durationMs > 0 ? Math.round(((result.synced || 0) + (result.created || 0)) / durationMs * 60000) : 0,
          });
        }
      } else if (action === 'test_connection') {
        result = { success: true, message: 'Successfully connected to SAP Business One' };
      }
    } finally {
      await sapClient.logout();
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SAP Sync Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage, pushResults: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Sync functions with detailed error tracking
async function syncBusinessPartners(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const conflicts: any[] = [];
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;

  if (direction === 'from_sap' || direction === 'bidirectional') {
    // Fetch all SAP BPs with pagination
    const sapBPs: any[] = [];
    const pageSize = 100;
    let skip = 0;
    while (sapBPs.length < recordLimit) {
      const remaining = recordLimit - sapBPs.length;
      const fetchSize = Math.min(pageSize, remaining);
      if (fetchSize <= 0) break;
      const page = await sapClient.getBusinessPartners(skip, fetchSize, updatedAfter);
      sapBPs.push(...page.items);
      console.log(`BP pagination: skip=${skip}, fetched=${page.items.length}, total=${sapBPs.length}, hasMore=${page.hasMore}`);
      if (!page.hasMore || page.items.length === 0) break;
      skip += page.items.length;
    }

    if (sapBPs.length > 0) {
      // Batch-fetch all existing BPs by card_code in one query
      const cardCodes = sapBPs.map(bp => bp.CardCode).filter(Boolean);
      const { data: existingBPs } = await supabase
        .from('business_partners')
        .select('id, card_code, card_name, phone, mobile, email, contact_person, billing_address, shipping_address, credit_limit, currency')
        .in('card_code', cardCodes);

      const existingMap = new Map((existingBPs || []).map((bp: any) => [bp.card_code, bp]));

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      const insertBatchWithFallback = async (batch: any[]) => {
        const { error } = await supabase.from('business_partners').insert(batch);
        if (!error) {
          created += batch.length;
          return;
        }

        console.error('Batch insert error:', error.message);

        for (const record of batch) {
          const { error: rowError } = await supabase.from('business_partners').insert(record);
          if (rowError) {
            console.error(`Business partner insert failed for ${record.card_code || 'unknown'}:`, rowError.message);
            pushResults.push({
              success: false,
              entityId: record.card_code || 'unknown',
              entityCode: record.card_code || 'unknown',
              error: rowError.message,
            });
            continue;
          }
          created += 1;
        }
      };

      for (const sapBP of sapBPs) {
        if (!sapBP.CardCode) {
          console.warn('Skipping SAP BP without CardCode');
          continue;
        }

        const existingBP = existingMap.get(sapBP.CardCode);
        const resolvedCardName = sapBP.CardName || sapBP.CardForeignName || sapBP.CardCode || 'Unnamed BP';
        const mappedData = {
          card_name: resolvedCardName,
          phone: sapBP.Phone1,
          mobile: sapBP.Phone2,
          email: sapBP.EmailAddress,
          contact_person: sapBP.ContactPerson,
          credit_limit: sapBP.CreditLimit,
          balance: sapBP.CurrentAccountBalance ?? null,
          payment_terms: sapBP.PayTermsGrpCode != null ? String(sapBP.PayTermsGrpCode) : null,
          card_foreign_name: sapBP.CardForeignName || null,
          phone2: sapBP.Phone2 || null,
          fax: sapBP.Fax || null,
          notes: sapBP.Notes || null,
          free_text: sapBP.FreeText || null,
          city: sapBP.City || null,
          country: sapBP.Country || null,
          industry: sapBP.Industry || null,
          alias_name: sapBP.AliasName || null,
          vat_reg_num: sapBP.FederalTaxID || null,
          group_code: sapBP.GroupCode != null ? String(sapBP.GroupCode) : null,
          territory: sapBP.Territory || null,
          series: sapBP.Series || null,
          owner_code: sapBP.OwnerCode || null,
          valid_for: sapBP.Valid === 'tYES',
          frozen_for: sapBP.Frozen === 'tYES',
          website: sapBP.Website || null,
          billing_address: sapBP.BillToState || null,
          shipping_address: sapBP.ShipToState || null,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: sapBP.CardCode,
          erp_synced: true,
          ...(companyId ? { company_id: companyId } : {}),
        };

        if (existingBP) {
          toUpdate.push({ id: existingBP.id, data: mappedData });
        } else {
          toInsert.push({
            ...mappedData,
            card_code: sapBP.CardCode,
            card_type: sapBP.CardType === 'cCustomer' ? 'customer' : sapBP.CardType === 'cSupplier' ? 'vendor' : 'lead',
            currency: sapBP.Currency,
            created_by: userId,
          });
        }
      }

      // Batch insert new BPs (chunks of 500)
      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500);
        await insertBatchWithFallback(batch);
      }

      // Batch update existing BPs (chunks of 50 for individual updates)
      const updatePromises = toUpdate.map(async ({ id, data }) => {
        const { error } = await supabase.from('business_partners').update(data).eq('id', id);
        if (error) {
          console.error(`Business partner update failed for ${id}:`, error.message);
          return false;
        }
        return true;
      }
      );
      // Process updates in parallel batches of 20
      for (let i = 0; i < updatePromises.length; i += 20) {
        const results = await Promise.all(updatePromises.slice(i, i + 20));
        synced += results.filter(Boolean).length;
      }

      // Batch insert conflicts
      if (conflicts.length > 0) {
        const conflictRecords = conflicts.map(c => ({
          entity_type: 'business_partner',
          entity_id: c.entityId || '',
          sap_doc_entry: c.sapCode || '',
          field_name: c.field,
          crm_value: String(c.crm || ''),
          sap_value: String(c.sap || ''),
        }));
        await supabase.from('sync_conflicts').insert(conflictRecords);
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    // Get records to push - only those needing sync (pending, error, null, or never synced)
    let query = supabase
      .from('business_partners')
      .select('*');

    if (entityId) {
      query = query.eq('id', entityId);
    } else {
      query = query.or('sync_status.eq.pending,sync_status.eq.error,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    }

    const { data: crmBPs, error: queryError } = await query;
    
    if (queryError) {
      console.error('Error fetching BPs for push:', queryError);
    }

    for (const crmBP of crmBPs || []) {
      const pushResult: PushResult = {
        success: false,
        entityId: crmBP.id,
        entityCode: crmBP.card_code,
      };

      try {
        if (crmBP.sap_doc_entry) {
          // Update in SAP
          const result = await sapClient.updateBusinessPartner(crmBP.card_code, crmBP);
          if (result.success) {
            await supabase
              .from('business_partners')
              .update({
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                erp_synced: true,
              })
              .eq('id', crmBP.id);
            pushResult.success = true;
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('business_partners')
              .update({ sync_status: 'error' })
              .eq('id', crmBP.id);
          }
        } else {
          // Create in SAP
          const result = await sapClient.createBusinessPartner(crmBP);
          if (result.success && result.data?.CardCode) {
            await supabase
              .from('business_partners')
              .update({
                sap_doc_entry: result.data.CardCode,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                erp_synced: true,
              })
              .eq('id', crmBP.id);
            pushResult.success = true;
            pushResult.sapDocEntry = result.data.CardCode;
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('business_partners')
              .update({ sync_status: 'error' })
              .eq('id', crmBP.id);
          }
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('business_partners')
          .update({ sync_status: 'error' })
          .eq('id', crmBP.id);
      }
      
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncItems(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, defaultWarehouse: string | null = null, updatedAfter?: string) {
  const fieldMappings = {
    item_code: 'ItemCode',
    description: 'ItemName',
    in_stock: 'QuantityOnStock',
    committed: 'QuantityOrderedByCustomers',
    ordered: 'QuantityOrderedFromVendors',
    warehouse: 'DefaultWarehouse',
    barcode: 'BarCode',
    manufacturer: 'Manufacturer',
  };

  const conflicts: any[] = [];
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allItems: any[] = [];
    let itemSkip = 0;
    const itemPageSize = 100;
    const toNumber = (value: any) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    while (allItems.length < recordLimit) {
      const remaining = recordLimit - allItems.length;
      const page = await sapClient.getItems(itemSkip, Math.min(itemPageSize, remaining), updatedAfter);
      // Fixed assets already excluded at API level via $filter
      allItems.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      itemSkip += page.items.length;
    }
    const sapItems = allItems;
    
    for (const sapItem of sapItems) {
      // Company-wide available qty from item-level quantities
      const companyAvailableQty = toNumber(sapItem.QuantityOnStock ?? 0) - toNumber(sapItem.QuantityOrderedByCustomers ?? 0);
      
      // Branch available qty: fetch warehouse-specific stock if default warehouse is set
      let branchAvailableQty = 0;
      if (defaultWarehouse) {
        try {
          const warehouseInfo = await sapClient.getItemWarehouseInfo(sapItem.ItemCode);
          const branchWh = warehouseInfo.find((wh: any) => {
            const warehouseCode = String(wh.WarehouseCode ?? wh.WhsCode ?? wh.Warehouse ?? '').trim();
            return warehouseCode === defaultWarehouse;
          });
          if (branchWh) {
            const inStock = toNumber(branchWh.InStock ?? branchWh.OnHand ?? branchWh.QuantityOnStock ?? 0);
            const committed = toNumber(branchWh.Committed ?? branchWh.IsCommited ?? branchWh.QuantityOrderedByCustomers ?? 0);
            branchAvailableQty = inStock - committed;
          }
        } catch (e) {
          // Skip warehouse info on error, keep branch qty as 0
        }
      }

      let existingItemQuery = supabase
        .from('items')
        .select('*')
        .eq('item_code', sapItem.ItemCode);

      if (companyId) {
        existingItemQuery = existingItemQuery.eq('company_id', companyId);
      }

      const { data: existingItem } = await existingItemQuery.maybeSingle();

      const itemData = {
        description: sapItem.ItemName,
        in_stock: sapItem.QuantityOnStock,
        committed: sapItem.QuantityOrderedByCustomers,
        ordered: sapItem.QuantityOrderedFromVendors,
        warehouse: sapItem.DefaultWarehouse,
        barcode: sapItem.BarCode,
        manufacturer: sapItem.Manufacturer,
        branch_available_qty: branchAvailableQty,
        company_available_qty: companyAvailableQty,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        sap_doc_entry: sapItem.ItemCode,
        erp_synced: true,
      };

      if (existingItem) {
        const itemConflicts = detectConflicts(existingItem, sapItem, fieldMappings);
        if (itemConflicts.length > 0) {
          for (const conflict of itemConflicts) {
            await supabase.from('sync_conflicts').insert({
              entity_type: 'item',
              entity_id: existingItem.id,
              sap_doc_entry: sapItem.ItemCode,
              field_name: conflict.field,
              crm_value: String(conflict.crm || ''),
              sap_value: String(conflict.sap || ''),
            });
            conflicts.push(conflict);
          }
        } else {
          await supabase
            .from('items')
            .update(itemData)
            .eq('id', existingItem.id);
          synced++;
        }
      } else {
        await supabase.from('items').insert({
          item_code: sapItem.ItemCode,
          item_type: sapItem.ItemType === 'itItems' ? 'inventory' : 'service',
          ...itemData,
          created_by: userId,
          ...(companyId ? { company_id: companyId } : {}),
        });
        created++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('items')
      .select('*');

    if (entityId) {
      query = query.eq('id', entityId);
    } else {
      query = query.or('sync_status.eq.pending,sync_status.eq.error,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    }

    const { data: crmItems } = await query;

    for (const crmItem of crmItems || []) {
      const pushResult: PushResult = {
        success: false,
        entityId: crmItem.id,
        entityCode: crmItem.item_code,
      };

      try {
        let needsCreate = !crmItem.sap_doc_entry;

        // If sap_doc_entry exists, try update first
        if (crmItem.sap_doc_entry) {
          const result = await sapClient.updateItem(crmItem.item_code, crmItem);
          if (result.success) {
            await supabase
              .from('items')
              .update({
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                erp_synced: true,
              })
              .eq('id', crmItem.id);
            pushResult.success = true;
            synced++;
          } else if (result.error && result.error.toLowerCase().includes('does not exist')) {
            // Item doesn't exist in SAP despite having sap_doc_entry — fall back to create
            console.log(`Item ${crmItem.item_code} not found in SAP, will create instead`);
            needsCreate = true;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('items')
              .update({ sync_status: 'error' })
              .eq('id', crmItem.id);
          }
        }

        // Create item in SAP if needed
        if (needsCreate && !pushResult.success) {
          const result = await sapClient.createItem(crmItem);
          if (result.success && result.data?.ItemCode) {
            await supabase
              .from('items')
              .update({
                sap_doc_entry: result.data.ItemCode,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                erp_synced: true,
              })
              .eq('id', crmItem.id);
            pushResult.success = true;
            pushResult.sapDocEntry = result.data.ItemCode;
            created++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('items')
              .update({ sync_status: 'error' })
              .eq('id', crmItem.id);
          }
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('items')
          .update({ sync_status: 'error' })
          .eq('id', crmItem.id);
      }

      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncSalesOrders(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allOrders: any[] = [];
    let orderSkip = 0;
    const orderPageSize = 100;
    while (allOrders.length < recordLimit) {
      const remaining = recordLimit - allOrders.length;
      const page = await sapClient.getSalesOrders(orderSkip, Math.min(orderPageSize, remaining), updatedAfter);
      allOrders.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      orderSkip += page.items.length;
    }
    const sapOrders = allOrders;
    
    for (const sapOrder of sapOrders) {
      const { data: existingOrder } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('sap_doc_entry', String(sapOrder.DocEntry))
        .maybeSingle();

      const mappedOrder: any = {
        doc_date: sapOrder.DocDate,
        due_date: sapOrder.DocDueDate,
        customer_code: sapOrder.CardCode,
        customer_name: sapOrder.CardName,
        total: sapOrder.DocTotal,
        currency: sapOrder.DocCurrency,
        remarks: sapOrder.Comments || null,
        contact_person: sapOrder.ContactPersonCode != null ? String(sapOrder.ContactPersonCode) : null,
        billing_address: sapOrder.Address || null,
        shipping_address: sapOrder.Address2 || null,
        discount_percent: sapOrder.DiscountPercent || null,
        tax_amount: sapOrder.VatSum || null,
        subtotal: sapOrder.DocTotal ? (sapOrder.DocTotal - (sapOrder.VatSum || 0)) : null,
        payment_terms: sapOrder.PaymentGroupCode != null ? String(sapOrder.PaymentGroupCode) : null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        sap_doc_entry: String(sapOrder.DocEntry),
        erp_doc_entry: String(sapOrder.DocEntry),
        erp_doc_num: String(sapOrder.DocNum || ''),
      };

      // Link to business partner if exists
      const { data: bpMatch } = await supabase
        .from('business_partners')
        .select('id')
        .eq('card_code', sapOrder.CardCode)
        .maybeSingle();
      if (bpMatch) {
        mappedOrder.customer_id = bpMatch.id;
      }

      if (!existingOrder) {
        await supabase.from('sales_orders').insert({
          ...mappedOrder,
          created_by: userId,
          ...(companyId ? { company_id: companyId } : {}),
        });
        created++;
      } else {
        // Update existing order with latest SAP data
        await supabase.from('sales_orders').update(mappedOrder).eq('id', existingOrder.id);
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    // Pre-load all dimensions for resolving IDs to cost_center codes
    const { data: allDimensions } = await supabase.from('dimensions').select('id, cost_center');
    const dimMap: Record<string, string> = {};
    for (const d of allDimensions || []) { dimMap[d.id] = d.cost_center; }

    let query = supabase
      .from('sales_orders')
      .select('*, sales_order_lines(*)')
      .or('sync_status.eq.pending,sync_status.is.null,sap_doc_entry.is.null');

    if (entityId) {
      query = query.eq('id', entityId);
    }

    const { data: crmOrders } = await query;

    for (const order of crmOrders || []) {
      const pushResult: PushResult = {
        success: false,
        entityId: order.id,
        entityCode: `SO-${order.doc_num}`,
      };

      try {
        if (!order.sap_doc_entry) {
          // Enrich lines with resolved dimension cost_center codes
          const enrichedLines = (order.sales_order_lines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dimMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dimMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dimMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dimMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createSalesOrder(order, enrichedLines);
          if (result.success && result.data?.DocEntry) {
            await supabase
              .from('sales_orders')
              .update({
                sap_doc_entry: String(result.data.DocEntry),
                erp_doc_entry: String(result.data.DocEntry),
                erp_doc_num: String(result.data.DocNum || ''),
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', order.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('sales_orders')
              .update({ sync_status: 'error' })
              .eq('id', order.id);
          }
        } else {
          // Already synced
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('sales_orders')
          .update({ sync_status: 'error' })
          .eq('id', order.id);
      }

      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncIncomingPayments(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allPayments: any[] = [];
    let paySkip = 0;
    while (allPayments.length < recordLimit) {
      const page = await sapClient.getIncomingPayments(paySkip, Math.min(100, recordLimit - allPayments.length), updatedAfter);
      allPayments.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      paySkip += page.items.length;
    }
    const sapPayments = allPayments;
    
    for (const sapPayment of sapPayments) {
      const { data: existingPayment } = await supabase
        .from('incoming_payments')
        .select('id')
        .eq('sap_doc_entry', String(sapPayment.DocEntry))
        .maybeSingle();

      const mappedPayment = {
        doc_date: sapPayment.DocDate,
        due_date: sapPayment.DocDueDate,
        customer_code: sapPayment.CardCode,
        customer_name: sapPayment.CardName,
        total_amount: sapPayment.DocTotal,
        currency: sapPayment.DocCurrency,
        remarks: sapPayment.Remarks || null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        sap_doc_entry: String(sapPayment.DocEntry),
        erp_doc_entry: String(sapPayment.DocEntry),
        erp_doc_num: String(sapPayment.DocNum || ''),
      };

      if (!existingPayment) {
        await supabase.from('incoming_payments').insert({
          ...mappedPayment,
          created_by: userId,
          ...(companyId ? { company_id: companyId } : {}),
        });
        created++;
      } else {
        await supabase.from('incoming_payments').update(mappedPayment).eq('id', existingPayment.id);
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('incoming_payments')
      .select('*')
      .or('sync_status.eq.pending,sync_status.is.null,sap_doc_entry.is.null');

    if (entityId) {
      query = query.eq('id', entityId);
    }

    const { data: crmPayments } = await query;

    for (const payment of crmPayments || []) {
      const pushResult: PushResult = {
        success: false,
        entityId: payment.id,
        entityCode: `PMT-${payment.doc_num}`,
      };

      try {
        if (!payment.sap_doc_entry) {
          const result = await sapClient.createIncomingPayment(payment);
          if (result.success && result.data?.DocEntry) {
            await supabase
              .from('incoming_payments')
              .update({
                sap_doc_entry: String(result.data.DocEntry),
                erp_doc_entry: String(result.data.DocEntry),
                erp_doc_num: String(result.data.DocNum || ''),
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', payment.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('incoming_payments')
              .update({ sync_status: 'error' })
              .eq('id', payment.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('incoming_payments')
          .update({ sync_status: 'error' })
          .eq('id', payment.id);
      }

      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncARInvoices(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allInvoices: any[] = [];
    let invSkip = 0;
    while (allInvoices.length < recordLimit) {
      const page = await sapClient.getARInvoices(invSkip, Math.min(100, recordLimit - allInvoices.length), updatedAfter);
      allInvoices.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      invSkip += page.items.length;
    }
    const sapInvoices = allInvoices;
    
    for (const sapInvoice of sapInvoices) {
      const { data: existingInvoice } = await supabase
        .from('ar_invoices')
        .select('id')
        .eq('sap_doc_entry', String(sapInvoice.DocEntry))
        .maybeSingle();

      const mappedInvoice: any = {
        doc_date: sapInvoice.DocDate,
        doc_due_date: sapInvoice.DocDueDate,
        customer_code: sapInvoice.CardCode,
        customer_name: sapInvoice.CardName,
        total: sapInvoice.DocTotal,
        currency: sapInvoice.DocCurrency,
        remarks: sapInvoice.Comments || null,
        num_at_card: sapInvoice.NumAtCard || null,
        payment_terms: sapInvoice.PaymentTermsGroup != null ? String(sapInvoice.PaymentTermsGroup) : null,
        tax_amount: sapInvoice.VatSum || null,
        subtotal: sapInvoice.DocTotal ? (sapInvoice.DocTotal - (sapInvoice.VatSum || 0)) : null,
        discount_percent: sapInvoice.DiscountPercent || null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        sap_doc_entry: String(sapInvoice.DocEntry),
        erp_doc_entry: String(sapInvoice.DocEntry),
        erp_doc_num: String(sapInvoice.DocNum || ''),
      };

      // Link to business partner
      const { data: bpMatch } = await supabase
        .from('business_partners')
        .select('id')
        .eq('card_code', sapInvoice.CardCode)
        .maybeSingle();
      if (bpMatch) {
        mappedInvoice.customer_id = bpMatch.id;
      }

      if (!existingInvoice) {
        await supabase.from('ar_invoices').insert({
          ...mappedInvoice,
          created_by: userId,
          ...(companyId ? { company_id: companyId } : {}),
        });
        created++;
      } else {
        await supabase.from('ar_invoices').update(mappedInvoice).eq('id', existingInvoice.id);
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    // Pre-load all dimensions for resolving IDs to cost_center codes
    const { data: allDimensions } = await supabase.from('dimensions').select('id, cost_center');
    const dimMap: Record<string, string> = {};
    for (const d of allDimensions || []) { dimMap[d.id] = d.cost_center; }

    let query = supabase
      .from('ar_invoices')
      .select('*, ar_invoice_lines(*)')
      .or('sync_status.eq.pending,sync_status.is.null,sap_doc_entry.is.null');

    if (entityId) {
      query = query.eq('id', entityId);
    }

    const { data: crmInvoices } = await query;

    for (const invoice of crmInvoices || []) {
      const pushResult: PushResult = {
        success: false,
        entityId: invoice.id,
        entityCode: `INV-${invoice.doc_num}`,
      };

      try {
        if (!invoice.sap_doc_entry) {
          // Enrich lines with resolved dimension cost_center codes
          const enrichedLines = (invoice.ar_invoice_lines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dimMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dimMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dimMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dimMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createARInvoice(invoice, enrichedLines);
          if (result.success && result.data?.DocEntry) {
            await supabase
              .from('ar_invoices')
              .update({
                sap_doc_entry: String(result.data.DocEntry),
                erp_doc_entry: String(result.data.DocEntry),
                erp_doc_num: String(result.data.DocNum || ''),
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', invoice.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase
              .from('ar_invoices')
              .update({ sync_status: 'error' })
              .eq('id', invoice.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('ar_invoices')
          .update({ sync_status: 'error' })
          .eq('id', invoice.id);
      }

      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

// ==================== PROCUREMENT SYNC FUNCTIONS ====================

async function syncPurchaseRequests(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allPRs: any[] = [];
    let prSkip = 0;
    while (allPRs.length < recordLimit) {
      const page = await sapClient.getPurchaseRequests(prSkip, Math.min(100, recordLimit - allPRs.length), updatedAfter);
      allPRs.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      prSkip += page.items.length;
    }
    const sapPRs = allPRs;
    for (const sapPR of sapPRs) {
      const { data: existing } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('sap_doc_entry', String(sapPR.DocEntry))
        .maybeSingle();

      if (!existing) {
        await supabase.from('purchase_requests').insert({
          pr_number: `PR-SAP-${sapPR.DocNum}`,
          doc_date: sapPR.DocDate,
          required_date: sapPR.ReqDate,
          requester_name: sapPR.RequesterName,
          remarks: sapPR.Comments,
          status: 'open',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapPR.DocEntry),
          erp_doc_entry: String(sapPR.DocEntry),
          erp_doc_num: String(sapPR.DocNum || ''),
          created_by: userId,
        });
        // Insert lines
        const lines = sapPR.DocumentLines || [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          await supabase.from('purchase_request_lines').insert({
            purchase_request_id: (await supabase.from('purchase_requests').select('id').eq('sap_doc_entry', String(sapPR.DocEntry)).single()).data?.id,
            line_num: i + 1,
            item_code: line.ItemCode,
            item_description: line.ItemDescription || line.ItemCode,
            quantity: line.Quantity,
            unit_price: line.UnitPrice || 0,
            line_total: (line.Quantity || 0) * (line.UnitPrice || 0),
          });
        }
        created++;
      } else {
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('purchase_requests')
      .select('*')
      .or('sync_status.eq.pending,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    if (entityId) query = query.eq('id', entityId);
    const { data: crmPRs } = await query;

    for (const pr of crmPRs || []) {
      const pushResult: PushResult = { success: false, entityId: pr.id, entityCode: pr.pr_number };
      try {
        if (!pr.sap_doc_entry) {
          const { data: prLines } = await supabase.from('purchase_request_lines').select('*').eq('purchase_request_id', pr.id);
          const { data: dimData } = await supabase.from('dimensions').select('id, cost_center');
          const dMap: Record<string, string> = {};
          for (const d of dimData || []) { dMap[d.id] = d.cost_center; }
          const enrichedPRLines = (prLines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createPurchaseRequest(pr, enrichedPRLines);
          if (result.success && result.data?.DocEntry) {
            await supabase.from('purchase_requests').update({
              sap_doc_entry: String(result.data.DocEntry),
              erp_doc_entry: String(result.data.DocEntry),
              erp_doc_num: String(result.data.DocNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', pr.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('purchase_requests').update({ sync_status: 'error' }).eq('id', pr.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('purchase_requests').update({ sync_status: 'error' }).eq('id', pr.id);
      }
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncPurchaseQuotations(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allPQs: any[] = [];
    let pqSkip = 0;
    while (allPQs.length < recordLimit) {
      const page = await sapClient.getPurchaseQuotations(pqSkip, Math.min(100, recordLimit - allPQs.length), updatedAfter);
      allPQs.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      pqSkip += page.items.length;
    }
    const sapPQs = allPQs;
    for (const sapPQ of sapPQs) {
      const { data: existing } = await supabase
        .from('purchase_quotations')
        .select('*')
        .eq('sap_doc_entry', String(sapPQ.DocEntry))
        .maybeSingle();

      if (!existing) {
        await supabase.from('purchase_quotations').insert({
          pq_number: `PQ-SAP-${sapPQ.DocNum}`,
          doc_date: sapPQ.DocDate,
          valid_until: sapPQ.DocDueDate,
          vendor_code: sapPQ.CardCode,
          vendor_name: sapPQ.CardName,
          total: sapPQ.DocTotal,
          subtotal: sapPQ.DocTotal,
          currency: sapPQ.DocCurrency,
          remarks: sapPQ.Comments,
          status: 'open',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapPQ.DocEntry),
          erp_doc_entry: String(sapPQ.DocEntry),
          erp_doc_num: String(sapPQ.DocNum || ''),
          created_by: userId,
        });
        created++;
      } else {
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('purchase_quotations')
      .select('*')
      .or('sync_status.eq.pending,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    if (entityId) query = query.eq('id', entityId);
    const { data: crmPQs } = await query;

    for (const pq of crmPQs || []) {
      const pushResult: PushResult = { success: false, entityId: pq.id, entityCode: pq.pq_number };
      try {
        if (!pq.sap_doc_entry) {
          const { data: pqLines } = await supabase.from('purchase_quotation_lines').select('*').eq('purchase_quotation_id', pq.id);
          const { data: dimData } = await supabase.from('dimensions').select('id, cost_center');
          const dMap: Record<string, string> = {};
          for (const d of dimData || []) { dMap[d.id] = d.cost_center; }
          const enrichedPQLines = (pqLines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createPurchaseQuotation(pq, enrichedPQLines);
          if (result.success && result.data?.DocEntry) {
            await supabase.from('purchase_quotations').update({
              sap_doc_entry: String(result.data.DocEntry),
              erp_doc_entry: String(result.data.DocEntry),
              erp_doc_num: String(result.data.DocNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', pq.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('purchase_quotations').update({ sync_status: 'error' }).eq('id', pq.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('purchase_quotations').update({ sync_status: 'error' }).eq('id', pq.id);
      }
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncPurchaseOrdersDocs(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allPOs: any[] = [];
    let poSkip = 0;
    while (allPOs.length < recordLimit) {
      const page = await sapClient.getPurchaseOrders(poSkip, Math.min(100, recordLimit - allPOs.length), updatedAfter);
      allPOs.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      poSkip += page.items.length;
    }
    const sapPOs = allPOs;
    for (const sapPO of sapPOs) {
      const { data: existing } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('sap_doc_entry', String(sapPO.DocEntry))
        .maybeSingle();

      if (!existing) {
        await supabase.from('purchase_orders').insert({
          po_number: `PO-SAP-${sapPO.DocNum}`,
          doc_date: sapPO.DocDate,
          delivery_date: sapPO.DocDueDate,
          vendor_code: sapPO.CardCode,
          vendor_name: sapPO.CardName,
          total: sapPO.DocTotal,
          subtotal: sapPO.DocTotal,
          currency: sapPO.DocCurrency,
          remarks: sapPO.Comments,
          status: 'approved',
          approval_status: 'approved',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapPO.DocEntry),
          erp_doc_entry: String(sapPO.DocEntry),
          erp_doc_num: String(sapPO.DocNum || ''),
          created_by: userId,
        });
        created++;
      } else {
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('purchase_orders')
      .select('*')
      .or('sync_status.eq.pending,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    if (entityId) query = query.eq('id', entityId);
    const { data: crmPOs } = await query;

    for (const po of crmPOs || []) {
      const pushResult: PushResult = { success: false, entityId: po.id, entityCode: po.po_number };
      try {
        if (!po.sap_doc_entry) {
          const { data: poLines } = await supabase.from('purchase_order_lines').select('*').eq('purchase_order_id', po.id);
          const { data: dimData } = await supabase.from('dimensions').select('id, cost_center');
          const dMap: Record<string, string> = {};
          for (const d of dimData || []) { dMap[d.id] = d.cost_center; }
          const enrichedPOLines = (poLines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createPurchaseOrder(po, enrichedPOLines);
          if (result.success && result.data?.DocEntry) {
            await supabase.from('purchase_orders').update({
              sap_doc_entry: String(result.data.DocEntry),
              erp_doc_entry: String(result.data.DocEntry),
              erp_doc_num: String(result.data.DocNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', po.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('purchase_orders').update({ sync_status: 'error' }).eq('id', po.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('purchase_orders').update({ sync_status: 'error' }).eq('id', po.id);
      }
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncGoodsReceipts(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allGRs: any[] = [];
    let grSkip = 0;
    while (allGRs.length < recordLimit) {
      const page = await sapClient.getGoodsReceipts(grSkip, Math.min(100, recordLimit - allGRs.length), updatedAfter);
      allGRs.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      grSkip += page.items.length;
    }
    const sapGRs = allGRs;
    for (const sapGR of sapGRs) {
      const { data: existing } = await supabase
        .from('goods_receipts')
        .select('*')
        .eq('sap_doc_entry', String(sapGR.DocEntry))
        .maybeSingle();

      if (!existing) {
        await supabase.from('goods_receipts').insert({
          grpo_number: `GRPO-SAP-${sapGR.DocNum}`,
          doc_date: sapGR.DocDate,
          vendor_code: sapGR.CardCode,
          vendor_name: sapGR.CardName,
          total: sapGR.DocTotal,
          subtotal: sapGR.DocTotal,
          remarks: sapGR.Comments,
          status: 'posted',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapGR.DocEntry),
          erp_doc_entry: String(sapGR.DocEntry),
          erp_doc_num: String(sapGR.DocNum || ''),
          created_by: userId,
        });
        created++;
      } else {
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('goods_receipts')
      .select('*')
      .or('sync_status.eq.pending,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    if (entityId) query = query.eq('id', entityId);
    const { data: crmGRs } = await query;

    for (const gr of crmGRs || []) {
      const pushResult: PushResult = { success: false, entityId: gr.id, entityCode: gr.grpo_number };
      try {
        if (!gr.sap_doc_entry) {
          const { data: grLines } = await supabase.from('goods_receipt_lines').select('*').eq('goods_receipt_id', gr.id);
          const { data: dimData } = await supabase.from('dimensions').select('id, cost_center');
          const dMap: Record<string, string> = {};
          for (const d of dimData || []) { dMap[d.id] = d.cost_center; }
          const enrichedGRLines = (grLines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createGoodsReceipt(gr, enrichedGRLines);
          if (result.success && result.data?.DocEntry) {
            await supabase.from('goods_receipts').update({
              sap_doc_entry: String(result.data.DocEntry),
              erp_doc_entry: String(result.data.DocEntry),
              erp_doc_num: String(result.data.DocNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', gr.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('goods_receipts').update({ sync_status: 'error' }).eq('id', gr.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('goods_receipts').update({ sync_status: 'error' }).eq('id', gr.id);
      }
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

async function syncAPInvoicesPayable(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    const allAPInvs: any[] = [];
    let apSkip = 0;
    while (allAPInvs.length < recordLimit) {
      const page = await sapClient.getAPInvoices(apSkip, Math.min(100, recordLimit - allAPInvs.length), updatedAfter);
      allAPInvs.push(...page.items);
      if (!page.hasMore || page.items.length === 0) break;
      apSkip += page.items.length;
    }
    const sapInvs = allAPInvs;
    for (const sapInv of sapInvs) {
      const { data: existing } = await supabase
        .from('ap_invoices')
        .select('*')
        .eq('sap_doc_entry', String(sapInv.DocEntry))
        .maybeSingle();

      if (!existing) {
        await supabase.from('ap_invoices').insert({
          invoice_number: `APINV-SAP-${sapInv.DocNum}`,
          doc_date: sapInv.DocDate,
          doc_due_date: sapInv.DocDueDate,
          vendor_code: sapInv.CardCode,
          vendor_name: sapInv.CardName,
          subtotal: sapInv.DocTotal,
          total: sapInv.DocTotal,
          currency: sapInv.DocCurrency,
          remarks: sapInv.Comments,
          status: 'posted',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapInv.DocEntry),
          erp_doc_entry: String(sapInv.DocEntry),
          erp_doc_num: String(sapInv.DocNum || ''),
          created_by: userId,
        });
        created++;
      } else {
        synced++;
      }
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase
      .from('ap_invoices')
      .select('*')
      .or('sync_status.eq.pending,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
    if (entityId) query = query.eq('id', entityId);
    const { data: crmInvs } = await query;

    for (const inv of crmInvs || []) {
      const pushResult: PushResult = { success: false, entityId: inv.id, entityCode: inv.invoice_number };
      try {
        if (!inv.sap_doc_entry) {
          const { data: invLines } = await supabase.from('ap_invoice_lines').select('*').eq('ap_invoice_id', inv.id);
          const { data: dimData } = await supabase.from('dimensions').select('id, cost_center');
          const dMap: Record<string, string> = {};
          for (const d of dimData || []) { dMap[d.id] = d.cost_center; }
          const enrichedInvLines = (invLines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createAPInvoice(inv, enrichedInvLines);
          if (result.success && result.data?.DocEntry) {
            await supabase.from('ap_invoices').update({
              sap_doc_entry: String(result.data.DocEntry),
              erp_doc_entry: String(result.data.DocEntry),
              erp_doc_num: String(result.data.DocNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', inv.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.DocEntry);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('ap_invoices').update({ sync_status: 'error' }).eq('id', inv.id);
          }
        } else {
          pushResult.success = true;
        }
      } catch (error) {
        pushResult.error = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('ap_invoices').update({ sync_status: 'error' }).eq('id', inv.id);
      }
      pushResults.push(pushResult);
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts, pushResults };
}

// Sync Numbering Series from SAP NNM1
async function syncNumberingSeries(supabase: any, sapClient: SAPB1Client) {
  let synced = 0;
  let created = 0;

  try {
    const sapSeries = await sapClient.getNumberingSeries();
    console.log(`Fetched ${sapSeries.length} numbering series from SAP`);
    if (sapSeries.length > 0) {
      console.log('Sample series keys:', JSON.stringify(Object.keys(sapSeries[0])));
      console.log('Sample series data:', JSON.stringify(sapSeries[0]));
    }
    // Batch upsert instead of one-by-one
    const records = sapSeries.map((s: any) => ({
      series: s.Series,
      series_name: s.SeriesName || s.Name || `Series ${s.Series}`,
      prefix: s.Prefix || null,
      first_no: s.InitialNumber || s.FirstNo || null,
      next_no: s.NextNumber || s.NextNo || null,
      last_no: s.LastNumber || s.LastNo || null,
      object_code: s.ObjectCode || '',
      document_sub_type: s.DocumentSubType || null,
      is_default: s.IsDefault === 'tYES',
      locked: s.Locked === 'tYES',
      group_code: s.GroupCode != null ? String(s.GroupCode) : null,
      sap_series_id: s.Series,
      last_synced_at: new Date().toISOString(),
    }));

    // Upsert in chunks of 100
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      const { data, error } = await supabase
        .from('numbering_series')
        .upsert(chunk, { onConflict: 'series,object_code' })
        .select('id');
      if (error) {
        console.error(`Upsert error chunk ${i}:`, JSON.stringify(error));
        // Fallback: insert one by one
        for (const rec of chunk) {
          const { data: existing } = await supabase
            .from('numbering_series')
            .select('id')
            .eq('series', rec.series)
            .eq('object_code', rec.object_code)
            .maybeSingle();
          if (existing) {
            await supabase.from('numbering_series').update(rec).eq('id', existing.id);
            synced++;
          } else {
            await supabase.from('numbering_series').insert(rec);
            created++;
          }
        }
      } else {
        synced += chunk.length;
      }
    }
  } catch (error) {
    console.error('Error syncing numbering series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults: [] };
  }

  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// Sync Sales Employees from SAP OHEM
async function syncSalesEmployees(supabase: any, sapClient: SAPB1Client) {
  let synced = 0;
  let created = 0;

  try {
    const sapEmployees = await sapClient.getSalesEmployees();
    console.log(`Fetched ${sapEmployees.length} sales employees from SAP`);

    for (const emp of sapEmployees) {
      const { data: existing } = await supabase
        .from('sales_employees')
        .select('id')
        .eq('slp_code', emp.SalesEmployeeCode)
        .maybeSingle();

      const record = {
        slp_code: emp.SalesEmployeeCode,
        slp_name: emp.SalesEmployeeName || `Employee ${emp.SalesEmployeeCode}`,
        email: emp.Email || null,
        phone: null,
        mobile: null,
        is_active: emp.Active === 'tYES',
        commission_percent: emp.CommissionForSalesEmployee || null,
        sap_emp_id: emp.SalesEmployeeCode,
        last_synced_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('sales_employees').update(record).eq('id', existing.id);
        synced++;
      } else {
        await supabase.from('sales_employees').insert(record);
        created++;
      }
    }
  } catch (error) {
    console.error('Error syncing sales employees:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults: [] };
  }

  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ========== Sync Opportunities (SalesOpportunities) ==========
async function syncOpportunities(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number, companyId: string | null = null, updatedAfter?: string) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  try {
    // Pull from SAP
    if (direction === 'from_sap' || direction === 'bidirectional') {
      let skip = 0;
      let totalFetched = 0;
      let hasMore = true;

      while (hasMore && totalFetched < recordLimit) {
        const batch = await sapClient.getOpportunities(skip, Math.min(100, recordLimit - totalFetched), updatedAfter);
        const sapOpps = batch.items;
        hasMore = batch.hasMore;
        skip += sapOpps.length;
        totalFetched += sapOpps.length;
        if (sapOpps.length === 0) break;

        for (const sapOpp of sapOpps) {
          const seqNo = String(sapOpp.SequentialNo);

          // Map SAP status
          let stage = 'Discovery';
          if (sapOpp.Status === 'so_Open') stage = 'Discovery';
          else if (sapOpp.Status === 'so_Sold') stage = 'Won';
          else if (sapOpp.Status === 'so_Lost') stage = 'Lost';

          // Find BP by CardCode
          let bpId: string | null = null;
          if (sapOpp.CardCode) {
            const { data: bp } = await supabase.from('business_partners').select('id').eq('card_code', sapOpp.CardCode).maybeSingle();
            if (bp) bpId = bp.id;
          }

          const mapped: any = {
            name: sapOpp.OpportunityName || `Opportunity ${seqNo}`,
            company: sapOpp.CardName || '',
            business_partner_id: bpId,
            customer_code: sapOpp.CardCode || null,
            value: sapOpp.MaxLocalTotal || 0,
            weighted_amount: sapOpp.WeightedAmountLocal || null,
            stage,
            probability: sapOpp.Status === 'so_Sold' ? 100 : sapOpp.Status === 'so_Lost' ? 0 : 50,
            expected_close: sapOpp.ClosingDate || null,
            start_date: sapOpp.StartDate || null,
            notes: sapOpp.Remarks || null,
            remarks: sapOpp.Remarks || null,
            contact_person: sapOpp.ContactPerson || null,
            sales_employee_code: sapOpp.SalesEmployee || null,
            source: sapOpp.Source ? String(sapOpp.Source) : null,
            interest_field: sapOpp.InterestField ? String(sapOpp.InterestField) : null,
            territory: sapOpp.Territory || null,
            industry: sapOpp.Industry ? String(sapOpp.Industry) : null,
            closing_type: sapOpp.ClosingType || null,
            reason: sapOpp.Reason || null,
            max_local_total: sapOpp.MaxLocalTotal || null,
            current_stage_no: sapOpp.CurrentStageNo || null,
            project_code: sapOpp.ProjectCode || null,
            sap_doc_entry: seqNo,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          };

          const { data: existing } = await supabase.from('opportunities').select('id').eq('sap_doc_entry', seqNo).maybeSingle();
          if (existing) {
            await supabase.from('opportunities').update(mapped).eq('id', existing.id);
            synced++;
          } else {
            mapped.created_by = userId;
            if (companyId) mapped.company_id = companyId;
            await supabase.from('opportunities').insert(mapped);
            created++;
          }
        }
      }
    }

    // Push to SAP
    if (direction === 'to_sap' || direction === 'bidirectional') {
      let query = supabase.from('opportunities').select('*');
      if (entityId) {
        query = query.eq('id', entityId);
      } else {
        query = query.or('sync_status.eq.pending,sync_status.eq.error,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
      }
      const { data: crmOpps } = await query.limit(recordLimit);

      for (const opp of (crmOpps || [])) {
        const pushResult: PushResult = { success: false, entityId: opp.id, entityCode: opp.name || opp.id };

        try {
          let needsCreate = !opp.sap_doc_entry;

          if (opp.sap_doc_entry) {
            const res = await sapClient.updateOpportunity(parseInt(opp.sap_doc_entry), opp);
            if (res.success) {
              pushResult.success = true;
              pushResult.sapDocEntry = opp.sap_doc_entry;
              await supabase.from('opportunities').update({ sync_status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', opp.id);
              synced++;
            } else if (res.error?.toLowerCase().includes('does not exist')) {
              needsCreate = true;
            } else {
              pushResult.error = res.error;
            }
          }

          if (needsCreate && !pushResult.success) {
            const res = await sapClient.createOpportunity(opp);
            if (res.success) {
              const sapDocEntry = res.data?.SequentialNo ? String(res.data.SequentialNo) : null;
              pushResult.success = true;
              pushResult.sapDocEntry = sapDocEntry || undefined;
              await supabase.from('opportunities').update({
                sap_doc_entry: sapDocEntry,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              }).eq('id', opp.id);
              created++;
            } else {
              pushResult.error = res.error;
            }
          }
        } catch (err) {
          pushResult.error = err instanceof Error ? err.message : 'Unknown error';
        }
        pushResults.push(pushResult);
      }
    }
  } catch (error) {
    console.error('Error syncing opportunities:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults };
  }

  const failedPushes = pushResults.filter(r => !r.success);
  return { success: failedPushes.length === 0, synced, created, conflicts: [], pushResults };
}

// ========== Sync Activities ==========
async function syncActivities(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number, companyId: string | null = null, updatedAfter?: string) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  try {
    // Pull from SAP
    if (direction === 'from_sap' || direction === 'bidirectional') {
      let skip = 0;
      let totalFetched = 0;
      let hasMore = true;

      while (hasMore && totalFetched < recordLimit) {
        const batch = await sapClient.getActivities(skip, Math.min(100, recordLimit - totalFetched), updatedAfter);
        const sapActs = batch.items;
        hasMore = batch.hasMore;
        skip += sapActs.length;
        totalFetched += sapActs.length;
        if (sapActs.length === 0) break;

        for (const sapAct of sapActs) {
          const actCode = String(sapAct.ActivityCode);

          // Map SAP activity type to CRM type (must satisfy DB CHECK constraint)
          const allowedTypes = new Set(['call', 'email', 'meeting', 'task', 'note']);
          const actionReverseMap: Record<string, string> = {
            'C': 'call', 'M': 'meeting', 'T': 'task', 'E': 'note', 'L': 'email',
          };
          const typeReverseMap: Record<string, string> = {
            '1': 'call', '2': 'meeting', '3': 'task', '4': 'note', '5': 'email', '-1': 'note',
            'cn_Call': 'call', 'cn_Meeting': 'meeting', 'cn_Task': 'task',
            'cn_Note': 'note', 'cn_Campaign': 'note', 'cn_Other': 'note',
          };
          const rawType = actionReverseMap[String(sapAct.Activity)] || typeReverseMap[String(sapAct.ActivityType)] || 'note';
          const crmType = allowedTypes.has(rawType) ? rawType : 'note';

          // Map priority
          const priMap: Record<string, string> = { 'pr_Low': 'low', 'pr_Normal': 'normal', 'pr_High': 'high' };

          // Find BP by CardCode
          let bpId: string | null = null;
          if (sapAct.CardCode) {
            const { data: bp } = await supabase.from('business_partners').select('id').eq('card_code', sapAct.CardCode).maybeSingle();
            if (bp) bpId = bp.id;
          }

          const mapped: any = {
            type: crmType,
            subject: (typeof sapAct.Details === 'string' && sapAct.Details.trim()) || (typeof sapAct.Notes === 'string' && sapAct.Notes.trim()) || `Activity ${actCode}`,
            description: sapAct.Notes || null,
            due_date: sapAct.ActivityDate || null,
            status: sapAct.Handled === 'tYES' ? 'completed' : 'pending',
            completed_at: sapAct.Handled === 'tYES' ? new Date().toISOString() : null,
            business_partner_id: bpId,
            card_code: sapAct.CardCode || null,
            activity_time: sapAct.ActivityTime || null,
            start_time: sapAct.StartTime || null,
            end_time: sapAct.EndTime || null,
            duration: sapAct.Duration || null,
            duration_type: sapAct.DurationType || null,
            location: sapAct.Location || null,
            priority: priMap[sapAct.Priority] || 'normal',
            sales_employee_code: sapAct.SalesEmployee || null,
            contact_person_code: sapAct.ContactPersonCode || null,
            doc_entry: sapAct.DocEntry ? String(sapAct.DocEntry) : null,
            doc_type: sapAct.DocType ? String(sapAct.DocType) : null,
            handled: sapAct.Handled || 'tNO',
            sap_doc_entry: actCode,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          };

          const { data: existing } = await supabase.from('activities').select('id').eq('sap_doc_entry', actCode).maybeSingle();
          if (existing) {
            const { error: updateError } = await supabase.from('activities').update(mapped).eq('id', existing.id);
            if (updateError) {
              console.error(`Failed updating activity ${actCode}:`, updateError.message);
            } else {
              synced++;
            }
          } else {
            mapped.created_by = userId;
            mapped.assigned_to = userId;
            if (companyId) mapped.company_id = companyId;
            const { error: insertError } = await supabase.from('activities').insert(mapped);
            if (insertError) {
              console.error(`Failed inserting activity ${actCode}:`, insertError.message, { type: mapped.type, subject: mapped.subject });
            } else {
              created++;
            }
          }
        }
      }
    }

    // Push to SAP
    if (direction === 'to_sap' || direction === 'bidirectional') {
      let query = supabase.from('activities').select('*');
      if (entityId) {
        query = query.eq('id', entityId);
      } else {
        query = query.or('sync_status.eq.pending,sync_status.eq.error,sync_status.eq.local,sync_status.is.null,sap_doc_entry.is.null');
      }
      const { data: crmActs } = await query.limit(recordLimit);

      for (const act of (crmActs || [])) {
        const pushResult: PushResult = { success: false, entityId: act.id, entityCode: act.subject || act.id };

        try {
          let needsCreate = !act.sap_doc_entry;

          if (act.sap_doc_entry) {
            const res = await sapClient.updateActivity(parseInt(act.sap_doc_entry), act);
            if (res.success) {
              pushResult.success = true;
              pushResult.sapDocEntry = act.sap_doc_entry;
              await supabase.from('activities').update({ sync_status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', act.id);
              synced++;
            } else if (res.error?.toLowerCase().includes('does not exist')) {
              needsCreate = true;
            } else {
              pushResult.error = res.error;
            }
          }

          if (needsCreate && !pushResult.success) {
            const res = await sapClient.createActivity(act);
            if (res.success) {
              const sapDocEntry = res.data?.ActivityCode ? String(res.data.ActivityCode) : null;
              pushResult.success = true;
              pushResult.sapDocEntry = sapDocEntry || undefined;
              await supabase.from('activities').update({
                sap_doc_entry: sapDocEntry,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              }).eq('id', act.id);
              created++;
            } else {
              pushResult.error = res.error;
            }
          }
        } catch (err) {
          pushResult.error = err instanceof Error ? err.message : 'Unknown error';
        }
        pushResults.push(pushResult);
      }
    }
  } catch (error) {
    console.error('Error syncing activities:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults };
  }

  const failedPushes = pushResults.filter(r => !r.success);
  return { success: failedPushes.length === 0, synced, created, conflicts: [], pushResults };
}

async function syncQuotes(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, updatedAfter?: string) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;

  try {
    if (direction === 'from_sap' || direction === 'bidirectional') {
      const allQuotes: any[] = [];
      let skip = 0;
      while (allQuotes.length < recordLimit) {
        const page = await sapClient.getQuotations(skip, Math.min(100, recordLimit - allQuotes.length), updatedAfter);
        allQuotes.push(...page.items);
        if (!page.hasMore || page.items.length === 0) break;
        skip += page.items.length;
      }

      for (const sapQuote of allQuotes) {
        const { data: existing } = await supabase
          .from('quotes')
          .select('id')
          .eq('sap_doc_entry', String(sapQuote.DocEntry))
          .maybeSingle();

        const mapped: any = {
          doc_date: sapQuote.DocDate,
          valid_until: sapQuote.DocDueDate,
          customer_code: sapQuote.CardCode,
          customer_name: sapQuote.CardName,
          total: sapQuote.DocTotal || 0,
          subtotal: sapQuote.DocTotal ? (sapQuote.DocTotal - (sapQuote.VatSum || 0)) : 0,
          tax_amount: sapQuote.VatSum || 0,
          currency: sapQuote.DocCurrency || 'SAR',
          notes: sapQuote.Comments || null,
          contact_person: sapQuote.ContactPersonCode != null ? String(sapQuote.ContactPersonCode) : null,
          billing_address: sapQuote.Address || null,
          shipping_address: sapQuote.Address2 || null,
          discount_percent: sapQuote.DiscountPercent || null,
          payment_terms: sapQuote.PaymentGroupCode != null ? String(sapQuote.PaymentGroupCode) : null,
          sales_employee_code: sapQuote.SalesPersonCode || null,
          num_at_card: sapQuote.NumAtCard || null,
          status: sapQuote.DocStatus === 'bost_Close' ? 'accepted' : 'sent',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: String(sapQuote.DocEntry),
          erp_doc_entry: String(sapQuote.DocEntry),
          erp_doc_num: String(sapQuote.DocNum || ''),
        };

        const { data: bpMatch } = await supabase
          .from('business_partners')
          .select('id')
          .eq('card_code', sapQuote.CardCode)
          .maybeSingle();
        if (bpMatch) mapped.customer_id = bpMatch.id;

        if (!existing) {
          await supabase.from('quotes').insert({ ...mapped, created_by: userId, ...(companyId ? { company_id: companyId } : {}) });
          created++;
        } else {
          await supabase.from('quotes').update(mapped).eq('id', existing.id);
          synced++;
        }
      }
    }

    if (direction === 'to_sap' || direction === 'bidirectional') {
      let query = supabase
        .from('quotes')
        .select('*, quote_lines(*)');
      if (entityId) {
        query = query.eq('id', entityId);
      } else {
        query = query.or('sync_status.eq.pending,sync_status.eq.error,sync_status.is.null,sap_doc_entry.is.null');
      }
      const { data: crmQuotes } = await query;

      // Pre-load all dimensions for resolving IDs to cost_center codes
      const { data: allDimensions } = await supabase.from('dimensions').select('id, cost_center');
      const dimMap: Record<string, string> = {};
      for (const d of allDimensions || []) { dimMap[d.id] = d.cost_center; }

      for (const quote of crmQuotes || []) {
        const pushResult: PushResult = { success: false, entityId: quote.id, entityCode: `Q-${quote.quote_number}` };
        try {
          if (!quote.sap_doc_entry) {
            // If no lines exist, create a single summary line from quote totals
            let lines = quote.quote_lines || [];
            if (lines.length === 0 && quote.subtotal > 0) {
              lines = [{
                description: quote.notes || 'Quotation item',
                quantity: 1,
                unit_price: quote.subtotal,
                discount_percent: 0,
                _no_item_code: true,
              }];
            }
            // Enrich lines with resolved dimension cost_center codes
            lines = lines.map((l: any) => ({
              ...l,
              _costing_code: l.dim_employee_id ? dimMap[l.dim_employee_id] : null,
              _costing_code2: l.dim_branch_id ? dimMap[l.dim_branch_id] : null,
              _costing_code3: l.dim_business_line_id ? dimMap[l.dim_business_line_id] : null,
              _costing_code4: l.dim_factory_id ? dimMap[l.dim_factory_id] : null,
            }));
            const result = await sapClient.createQuotation(quote, lines);
            if (result.success && result.data?.DocEntry) {
              await supabase.from('quotes').update({
                sap_doc_entry: String(result.data.DocEntry),
                erp_doc_entry: String(result.data.DocEntry),
                erp_doc_num: String(result.data.DocNum || ''),
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              }).eq('id', quote.id);
              pushResult.success = true;
              pushResult.sapDocEntry = String(result.data.DocEntry);
              synced++;
            } else {
              pushResult.error = result.error;
              await supabase.from('quotes').update({ sync_status: 'error' }).eq('id', quote.id);
            }
          } else {
            pushResult.success = true;
          }
        } catch (error) {
          pushResult.error = error instanceof Error ? error.message : 'Unknown error';
          await supabase.from('quotes').update({ sync_status: 'error' }).eq('id', quote.id);
        }
        pushResults.push(pushResult);
      }
    }
  } catch (error) {
    console.error('Error syncing quotes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults };
  }

  const failedPushes = pushResults.filter(r => !r.success);
  return { success: failedPushes.length === 0, synced, created, conflicts: [], pushResults };
}

// SAP Dimension mapping: InWhichDimension number -> dimension_type
const DIMENSION_TYPE_MAP: Record<number, string> = {
  1: 'employees',
  2: 'branches',
  3: 'business_line',
  4: 'factory',
  5: 'dimension_5',
};

function normalizeDimensionLabel(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

async function resolveDimensionSyncMap(supabase: any, sapClient: SAPB1Client, companyId: string | null) {
  const sapNumberToLocalType: Record<number, string> = { ...DIMENSION_TYPE_MAP };
  const localTypeToSapNumber: Record<string, number> = Object.fromEntries(
    Object.entries(DIMENSION_TYPE_MAP).map(([num, type]) => [type, Number(num)])
  );

  if (!companyId) {
    return { sapNumberToLocalType, localTypeToSapNumber };
  }

  try {
    const [{ data: localLevels, error: localLevelsError }, sapDefinitions] = await Promise.all([
      supabase
        .from('dimension_levels')
        .select('dimension_number, name')
        .eq('company_id', companyId),
      sapClient.getDimensionDefinitions(),
    ]);

    if (localLevelsError) {
      console.warn('Could not load local dimension levels for sync mapping:', localLevelsError.message);
      return { sapNumberToLocalType, localTypeToSapNumber };
    }

    const localLevelByName = new Map<string, number>();
    for (const level of localLevels || []) {
      const normalizedName = normalizeDimensionLabel(level.name);
      if (normalizedName) {
        localLevelByName.set(normalizedName, Number(level.dimension_number));
      }
    }

    for (const def of sapDefinitions || []) {
      const sapNumber = Number(def.DimensionCode);
      if (!DIMENSION_TYPE_MAP[sapNumber]) continue;

      const localDimensionNumber = localLevelByName.get(normalizeDimensionLabel(def.DimensionDescription));
      if (!localDimensionNumber || !DIMENSION_TYPE_MAP[localDimensionNumber]) continue;

      const localType = DIMENSION_TYPE_MAP[localDimensionNumber];
      sapNumberToLocalType[sapNumber] = localType;
      localTypeToSapNumber[localType] = sapNumber;
    }

    console.log('Resolved dimension sync map:', JSON.stringify({ sapNumberToLocalType, localTypeToSapNumber }));
  } catch (error) {
    console.warn('Falling back to numeric dimension mapping:', error instanceof Error ? error.message : error);
  }

  return { sapNumberToLocalType, localTypeToSapNumber };
}

async function syncDimensions(supabase: any, sapClient: SAPB1Client, direction: string, userId: string, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  try {
    const { sapNumberToLocalType, localTypeToSapNumber } = await resolveDimensionSyncMap(supabase, sapClient, companyId);

    // ===== PULL FROM SAP =====
    if (direction === 'from_sap' || direction === 'bidirectional') {
      // Profit centers come from OPRC and are assigned using SAP Dimension Description -> local Dimension Name mapping
      const profitCenters = await sapClient.getProfitCenters();
      console.log(`Processing ${profitCenters.length} profit centers from SAP OPRC`);

      for (const pc of profitCenters) {
        if (pc.InWhichDimension !== 1) continue;
        const dimType = sapNumberToLocalType[1] || DIMENSION_TYPE_MAP[1];
        if (!dimType) continue;

        const mapped: any = {
          dimension_type: dimType,
          cost_center: pc.CenterCode,
          name: pc.CenterName || pc.CenterCode,
          dimension_code: '1',
          effective_from: pc.EffectiveFrom || null,
          effective_to: pc.EffectiveTo || null,
          is_active: pc.Active === 'tYES',
          sap_doc_entry: pc.CenterCode,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          company_id: companyId,
        };

        let existingQuery = supabase
          .from('dimensions').select('id')
          .eq('cost_center', pc.CenterCode).eq('dimension_type', dimType);
        if (companyId) existingQuery = existingQuery.eq('company_id', companyId);
        const { data: existing } = await existingQuery.maybeSingle();

        if (existing) {
          await supabase.from('dimensions').update(mapped).eq('id', existing.id);
          synced++;
        } else {
          mapped.created_by = userId;
          await supabase.from('dimensions').insert(mapped);
          created++;
        }
      }

      // Distribution rules come from OOCR and are assigned using SAP Dimension Description -> local Dimension Name mapping
      const distRules = await sapClient.getDistributionRules();
      console.log(`Processing ${distRules.length} distribution rules from SAP OOCR (Dimensions 2-5)`);

      for (const rule of distRules) {
        const dimType = sapNumberToLocalType[Number(rule.InWhichDimension)];
        if (!dimType) {
          console.log(`Skipping distribution rule ${rule.FactorCode} dim=${rule.InWhichDimension}`);
          continue;
        }

        const mapped: any = {
          dimension_type: dimType,
          cost_center: rule.FactorCode,
          name: rule.FactorDescription || rule.FactorCode,
          dimension_code: String(rule.InWhichDimension),
          is_active: rule.Active === 'tYES',
          sap_doc_entry: rule.FactorCode,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          company_id: companyId,
        };

        let existingDimQuery = supabase
          .from('dimensions').select('id')
          .eq('cost_center', rule.FactorCode).eq('dimension_type', dimType);
        if (companyId) existingDimQuery = existingDimQuery.eq('company_id', companyId);
        const { data: existing } = await existingDimQuery.maybeSingle();

        if (existing) {
          await supabase.from('dimensions').update(mapped).eq('id', existing.id);
          synced++;
        } else {
          mapped.created_by = userId;
          await supabase.from('dimensions').insert(mapped);
          created++;
        }
      }

      // ===== ALSO POPULATE cost_centers TABLE (from Dim 1 OPRC) =====
      console.log('Syncing profit centers to cost_centers table...');
      for (const pc of profitCenters) {
        if (pc.InWhichDimension !== 1) continue;
        const dimType = sapNumberToLocalType[1] || DIMENSION_TYPE_MAP[1];
        if (!dimType) continue;
        const ccMapped: any = {
          code: pc.CenterCode,
          name: pc.CenterName || pc.CenterCode,
          dimension_type: dimType,
          is_active: pc.Active === 'tYES',
          company_id: companyId,
        };
        let ccQuery = supabase.from('cost_centers').select('id').eq('code', pc.CenterCode);
        if (companyId) ccQuery = ccQuery.eq('company_id', companyId);
        const { data: existingCC } = await ccQuery.maybeSingle();
        if (existingCC) {
          await supabase.from('cost_centers').update(ccMapped).eq('id', existingCC.id);
        } else {
          await supabase.from('cost_centers').insert(ccMapped);
        }
      }

      // ===== ALSO POPULATE distribution_rules TABLE (from Dim 2-5 OOCR) =====
      console.log('Syncing distribution rules to distribution_rules table...');
      for (const rule of distRules) {
        const dimType = sapNumberToLocalType[Number(rule.InWhichDimension)];
        if (!dimType) continue;
        const drMapped: any = {
          code: rule.FactorCode,
          name: rule.FactorDescription || rule.FactorCode,
          dimension_type: dimType,
          is_active: rule.Active === 'tYES',
          factor: String(rule.InWhichDimension),
          company_id: companyId,
        };
        let drQuery = supabase.from('distribution_rules').select('id').eq('code', rule.FactorCode);
        if (companyId) drQuery = drQuery.eq('company_id', companyId);
        const { data: existingDR } = await drQuery.maybeSingle();
        if (existingDR) {
          await supabase.from('distribution_rules').update(drMapped).eq('id', existingDR.id);
        } else {
          await supabase.from('distribution_rules').insert(drMapped);
        }
      }
      console.log('cost_centers and distribution_rules tables synced.');
    }

    // ===== PUSH TO SAP =====
    if (direction === 'to_sap' || direction === 'bidirectional') {
      // Fetch local dimensions that need pushing (not yet synced or modified)
      let localDimsQuery = supabase
        .from('dimensions').select('*')
        .or('sync_status.is.null,sync_status.neq.synced');
      if (companyId) localDimsQuery = localDimsQuery.eq('company_id', companyId);
      const { data: localDims } = await localDimsQuery;

      for (const dim of (localDims || [])) {
        const pushResult: PushResult = { success: false, entityId: dim.id, entityCode: dim.cost_center };
        const dimNum = localTypeToSapNumber[dim.dimension_type];

        try {
          if (!dimNum) {
            pushResult.error = `No SAP dimension mapping found for local dimension type ${dim.dimension_type}`;
            pushResults.push(pushResult);
            continue;
          }

          if (dimNum === 1) {
            // Push to ProfitCenters (OPRC)
            const payload: any = {
              CenterCode: dim.cost_center,
              CenterName: dim.name,
              InWhichDimension: 1,
              Active: dim.is_active ? 'tYES' : 'tNO',
            };
            if (dim.effective_from) payload.EffectiveFrom = dim.effective_from;
            if (dim.effective_to) payload.EffectiveTo = dim.effective_to;

            // Try update first, then create
            const updateRes = await fetch(`${(sapClient as any).baseUrl}/ProfitCenters('${dim.cost_center}')`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Cookie': `B1SESSION=${(sapClient as any).session?.sessionId}; ROUTEID=${(sapClient as any).session?.routeId}` },
              body: JSON.stringify(payload),
            });

            if (updateRes.ok || updateRes.status === 204) {
              pushResult.success = true;
              pushResult.sapDocEntry = dim.cost_center;
            } else {
              // Try create
              const createRes = await fetch(`${(sapClient as any).baseUrl}/ProfitCenters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': `B1SESSION=${(sapClient as any).session?.sessionId}; ROUTEID=${(sapClient as any).session?.routeId}` },
                body: JSON.stringify(payload),
              });
              if (createRes.ok) {
                pushResult.success = true;
                pushResult.sapDocEntry = dim.cost_center;
              } else {
                const errText = await createRes.text().catch(() => '');
                pushResult.error = errText.slice(0, 200);
              }
            }
          } else {
            // Push to DistributionRules (OOCR)
            const payload: any = {
              FactorCode: dim.cost_center,
              FactorDescription: dim.name,
              InWhichDimension: dimNum,
              Active: dim.is_active ? 'tYES' : 'tNO',
            };

            const updateRes = await fetch(`${(sapClient as any).baseUrl}/DistributionRules('${dim.cost_center}')`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Cookie': `B1SESSION=${(sapClient as any).session?.sessionId}; ROUTEID=${(sapClient as any).session?.routeId}` },
              body: JSON.stringify(payload),
            });

            if (updateRes.ok || updateRes.status === 204) {
              pushResult.success = true;
              pushResult.sapDocEntry = dim.cost_center;
            } else {
              const createRes = await fetch(`${(sapClient as any).baseUrl}/DistributionRules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': `B1SESSION=${(sapClient as any).session?.sessionId}; ROUTEID=${(sapClient as any).session?.routeId}` },
                body: JSON.stringify(payload),
              });
              if (createRes.ok) {
                pushResult.success = true;
                pushResult.sapDocEntry = dim.cost_center;
              } else {
                const errText = await createRes.text().catch(() => '');
                pushResult.error = errText.slice(0, 200);
              }
            }
          }

          if (pushResult.success) {
            await supabase.from('dimensions').update({
              sap_doc_entry: dim.cost_center,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', dim.id);
            synced++;
          }
        } catch (err) {
          pushResult.error = err instanceof Error ? err.message : 'Unknown error';
        }
        pushResults.push(pushResult);
      }
    }
  } catch (error) {
    console.error('Error syncing dimensions:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created, pushResults };
  }

  const failedPushes = pushResults.filter(r => !r.success);
  return { success: failedPushes.length === 0, synced, created, conflicts: [], pushResults };
}

// Sync SAP ProfitCenters -> cost_centers table
async function syncCostCenters(supabase: any, sapClient: SAPB1Client, direction: string, userId: string, companyId: string | null = null, recordLimit = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  try {
    if (direction === 'from_sap' || direction === 'bidirectional') {
      const profitCenters = await sapClient.getProfitCenters(recordLimit);
      console.log(`syncCostCenters: Processing ${profitCenters.length} profit centers from SAP (limit ${recordLimit})`);

      for (const pc of profitCenters) {
        const mapped: any = {
          code: pc.CenterCode,
          name: pc.CenterName || pc.CenterCode,
          dimension_type: `Dimension ${pc.InWhichDimension || 1}`,
          is_active: pc.Active === 'tYES',
          effective_from: pc.EffectiveFrom || null,
          effective_to: pc.EffectiveTo || null,
          erp_synced: true,
          company_id: companyId,
        };

        let q = supabase.from('cost_centers').select('id').eq('code', pc.CenterCode);
        if (companyId) q = q.eq('company_id', companyId);
        const { data: existing } = await q.maybeSingle();

        if (existing) {
          await supabase.from('cost_centers').update(mapped).eq('id', existing.id);
          synced++;
        } else {
          await supabase.from('cost_centers').insert(mapped);
          created++;
        }
      }
    }

    if (direction === 'to_sap' || direction === 'bidirectional') {
      let q = supabase.from('cost_centers').select('*');
      if (companyId) q = q.eq('company_id', companyId);
      const { data: localCCs } = await q;
      for (const cc of (localCCs || [])) {
        try {
          const payload = { CenterCode: cc.code, CenterName: cc.name, Active: cc.is_active ? 'tYES' : 'tNO' };
          const updateRes = await fetch(`${(sapClient as any).baseUrl}/ProfitCenters('${cc.code}')`, {
            method: 'PATCH', headers: (sapClient as any).headers, body: JSON.stringify(payload),
          });
          if (updateRes.ok) {
            pushResults.push({ success: true, entityId: cc.id, entityCode: cc.code });
            synced++;
          } else if (updateRes.status === 404) {
            const createRes = await fetch(`${(sapClient as any).baseUrl}/ProfitCenters`, {
              method: 'POST', headers: (sapClient as any).headers, body: JSON.stringify(payload),
            });
            pushResults.push({ success: createRes.ok, entityId: cc.id, entityCode: cc.code, error: createRes.ok ? undefined : `Create failed: ${createRes.status}` });
            if (createRes.ok) created++;
          } else {
            pushResults.push({ success: false, entityId: cc.id, entityCode: cc.code, error: `Update failed: ${updateRes.status}` });
          }
        } catch (e: any) {
          pushResults.push({ success: false, entityId: cc.id, entityCode: cc.code, error: e.message });
        }
      }
    }
  } catch (e: any) {
    console.error('syncCostCenters error:', e.message);
    return { success: false, synced, created, conflicts: [], pushResults, error: e.message };
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

// Sync SAP DistributionRules -> distribution_rules table
async function syncDistributionRules(supabase: any, sapClient: SAPB1Client, direction: string, userId: string, companyId: string | null = null, recordLimit = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  try {
    if (direction === 'from_sap' || direction === 'bidirectional') {
      const distRules = await sapClient.getDistributionRules(recordLimit);
      console.log(`syncDistributionRules: Processing ${distRules.length} distribution rules from SAP (limit ${recordLimit})`);

      for (const rule of distRules) {
        const mapped: any = {
          code: rule.FactorCode,
          name: rule.FactorDescription || rule.FactorCode,
          dimension_type: `Dimension ${rule.InWhichDimension || 1}`,
          factor: String(rule.InWhichDimension || ''),
          is_active: rule.Active === 'tYES',
          description: `SAP Dimension ${rule.InWhichDimension}`,
          company_id: companyId,
        };

        let q = supabase.from('distribution_rules').select('id').eq('code', rule.FactorCode);
        if (companyId) q = q.eq('company_id', companyId);
        const { data: existing } = await q.maybeSingle();

        if (existing) {
          await supabase.from('distribution_rules').update(mapped).eq('id', existing.id);
          synced++;
        } else {
          await supabase.from('distribution_rules').insert(mapped);
          created++;
        }
      }
    }

    if (direction === 'to_sap' || direction === 'bidirectional') {
      let q = supabase.from('distribution_rules').select('*');
      if (companyId) q = q.eq('company_id', companyId);
      const { data: localRules } = await q;
      for (const rule of (localRules || [])) {
        try {
          const payload = { FactorCode: rule.code, FactorDescription: rule.name, Active: rule.is_active ? 'tYES' : 'tNO' };
          const updateRes = await fetch(`${(sapClient as any).baseUrl}/DistributionRules('${rule.code}')`, {
            method: 'PATCH', headers: (sapClient as any).headers, body: JSON.stringify(payload),
          });
          if (updateRes.ok) {
            pushResults.push({ success: true, entityId: rule.id, entityCode: rule.code });
            synced++;
          } else if (updateRes.status === 404) {
            const createRes = await fetch(`${(sapClient as any).baseUrl}/DistributionRules`, {
              method: 'POST', headers: (sapClient as any).headers, body: JSON.stringify(payload),
            });
            pushResults.push({ success: createRes.ok, entityId: rule.id, entityCode: rule.code, error: createRes.ok ? undefined : `Create failed: ${createRes.status}` });
            if (createRes.ok) created++;
          } else {
            pushResults.push({ success: false, entityId: rule.id, entityCode: rule.code, error: `Update failed: ${updateRes.status}` });
          }
        } catch (e: any) {
          pushResults.push({ success: false, entityId: rule.id, entityCode: rule.code, error: e.message });
        }
      }
    }
  } catch (e: any) {
    console.error('syncDistributionRules error:', e.message);
    return { success: false, synced, created, conflicts: [], pushResults, error: e.message };
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

// Sync Dimension Level definitions from SAP
async function syncDimensionLevels(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  try {
    const definitions = await sapClient.getDimensionDefinitions();
    console.log(`Processing ${definitions.length} dimension definitions from SAP`);

    for (const def of definitions) {
      const dimNum = def.DimensionCode;
      if (dimNum < 1 || dimNum > 5) continue;

      const mapped: any = {
        dimension_number: dimNum,
        name: def.DimensionDescription || `Dimension ${dimNum}`,
        description: def.DimensionDescription || null,
        is_active: def.IsActive === 'tYES',
      };

      if (companyId) {
        mapped.company_id = companyId;
        const { data: existing } = await supabase
          .from('dimension_levels').select('id')
          .eq('company_id', companyId).eq('dimension_number', dimNum).maybeSingle();
        if (existing) {
          await supabase.from('dimension_levels').update(mapped).eq('id', existing.id);
          synced++;
        } else {
          await supabase.from('dimension_levels').insert(mapped);
          created++;
        }
      }
    }
    console.log(`Dimension levels synced: ${synced} updated, ${created} created`);
  } catch (error) {
    console.error('Error syncing dimension levels:', error);
  }
  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// Sync Payment Means (G/L Accounts where Finance='Y') from SAP OACT
async function syncPaymentMeansAccounts(supabase: any, sapClient: SAPB1Client) {
  let synced = 0;
  let created = 0;

  try {
    const baseUrl = (sapClient as any).baseUrl;
    const sessionId = (sapClient as any).session?.sessionId;
    const routeId = (sapClient as any).session?.routeId;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cookie': `B1SESSION=${sessionId}; ROUTEID=${routeId}` };

    let accounts: any[] = [];

    // Use ChartOfAccounts OData with CashAccount filter (CashAccount = Finanse column in OACT)
    console.log('Payment Means: Fetching ChartOfAccounts where CashAccount=tYES (Finanse=Y)...');
    try {
      let skip = 0;
      const top = 500;
      let hasMore = true;
      while (hasMore) {
        const url = `${baseUrl}/ChartOfAccounts?$filter=CashAccount eq 'tYES'&$select=Code,Name&$skip=${skip}&$top=${top}`;
        console.log(`Fetching: ${url}`);
        const apiResponse = await fetch(url, { headers });
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          const items = apiData.value || [];
          for (const item of items) {
            accounts.push({ AcctCode: item.Code, AcctName: item.Name });
          }
          hasMore = !!apiData['odata.nextLink'] && items.length === top;
          skip += top;
        } else {
          const errText = await apiResponse.text();
          console.log(`ChartOfAccounts CashAccount filter failed (${apiResponse.status}): ${errText}`);
          hasMore = false;
        }
      }
    } catch (e) {
      console.log('ChartOfAccounts CashAccount error:', e instanceof Error ? e.message : e);
    }

    // Fallback: try without filter and log warning
    if (accounts.length === 0) {
      console.log('Payment Means: CashAccount filter returned 0. Trying unfiltered as fallback...');
      try {
        let skip = 0;
        const top = 500;
        let hasMore = true;
        while (hasMore) {
          const apiResponse = await fetch(
            `${baseUrl}/ChartOfAccounts?$select=Code,Name,CashAccount&$skip=${skip}&$top=${top}`,
            { headers }
          );
          if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            const items = apiData.value || [];
            // Client-side filter for CashAccount/Finanse
            for (const item of items) {
              if (item.CashAccount === 'tYES') {
                accounts.push({ AcctCode: item.Code, AcctName: item.Name });
              }
            }
            hasMore = !!apiData['odata.nextLink'] && items.length === top;
            skip += top;
          } else {
            const errText = await apiResponse.text();
            console.log(`ChartOfAccounts unfiltered failed (${apiResponse.status}): ${errText}`);
            hasMore = false;
          }
        }
        console.log(`Client-side filtered: ${accounts.length} accounts with CashAccount=tYES`);
      } catch (e) {
        console.log('ChartOfAccounts fallback error:', e instanceof Error ? e.message : e);
      }
    }

    if (accounts.length === 0) {
      throw new Error('No financial accounts (Finanse=Y) found in SAP. Check that cash/bank accounts exist with the Finance flag enabled.');
    }
    console.log(`Got ${accounts.length} financial accounts from SAP`);

    for (const acct of accounts) {
      const code = acct.AcctCode || acct.Code;
      const name = acct.AcctName || acct.Name || code;
      if (!code) continue;

      try {
        const { data: existing } = await supabase
          .from('payment_means_accounts')
          .select('id')
          .eq('acct_code', code)
          .maybeSingle();

        if (existing) {
          await supabase.from('payment_means_accounts').update({
            acct_name: name,
            sap_synced_at: new Date().toISOString(),
            last_sync_error: null,
          }).eq('id', existing.id);
          synced++;
        } else {
          await supabase.from('payment_means_accounts').insert({
            acct_code: code,
            acct_name: name,
            sap_synced_at: new Date().toISOString(),
          });
          created++;
        }
      } catch (acctError) {
        const errMsg = acctError instanceof Error ? acctError.message : 'Unknown error';
        await supabase.from('payment_means_accounts').update({
          last_sync_error: errMsg,
        }).eq('acct_code', code);
        await supabase.from('sync_error_logs').insert({
          entity_type: 'payment_means',
          entity_code: code,
          direction: 'from_sap',
          error_message: errMsg,
        });
      }
    }
  } catch (error) {
    console.error('Error syncing payment means accounts:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from('sync_error_logs').insert({
      entity_type: 'payment_means',
      direction: 'from_sap',
      error_message: errMsg,
    });
    return { success: false, error: errMsg, synced, created };
  }

  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ==================== WAREHOUSES SYNC ====================
async function syncWarehouses(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;

  try {
    const sapWarehouses = await sapClient.getWarehouses();
    if (sapWarehouses.length === 0) {
      return { success: true, synced: 0, created: 0, conflicts: [], pushResults: [] };
    }

    for (const wh of sapWarehouses) {
      const whCode = wh.WarehouseCode || wh.WhsCode || null;
      if (!whCode) continue;
      const record = {
        warehouse_code: whCode,
        warehouse_name: wh.WarehouseName || wh.WhsName || whCode,
        location: wh.Location || wh.City || null,
        branch_code: wh.BranchCode != null ? String(wh.BranchCode) : (wh.BPLID != null ? String(wh.BPLID) : null),
        is_active: wh.Inactive === 'tNO' || wh.Inactive === false || wh.Inactive == null,
        sap_synced_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('warehouses')
        .select('id')
        .eq('warehouse_code', record.warehouse_code)
        .maybeSingle();

      if (existing) {
        await supabase.from('warehouses').update(record).eq('id', existing.id);
        synced++;
      } else {
        await supabase.from('warehouses').insert({ ...record, ...(companyId ? { company_id: companyId } : {}) });
        created++;
      }
    }
  } catch (error) {
    console.error('Error syncing warehouses:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errMsg, synced, created };
  }

  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ==================== BRANCHES SYNC (from Warehouses) ====================
async function syncBranches(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;

  try {
    const sapWarehouses = await sapClient.getWarehouses();
    if (sapWarehouses.length === 0) {
      return { success: true, synced: 0, created: 0, conflicts: [], pushResults: [] };
    }

    // Get the company_id to use - need a valid one for the branches FK
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: firstCompany } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .maybeSingle();
      targetCompanyId = firstCompany?.id;
    } else {
      // companyId is from sap_companies, we need the companies table id (FK target)
      const { data: sapComp } = await supabase
        .from('sap_companies')
        .select('company_name')
        .eq('id', companyId)
        .maybeSingle();
      if (sapComp) {
        const sapName = sapComp.company_name || '';
        console.log('Looking up companies table for SAP company:', sapName);
        const { data: comp } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', `%${sapName}%`)
          .maybeSingle();
        if (comp) {
          targetCompanyId = comp.id;
          console.log('Matched companies table id:', targetCompanyId);
        } else {
          // fallback: get first company
          const { data: fc } = await supabase.from('companies').select('id').limit(1).maybeSingle();
          targetCompanyId = fc?.id;
          console.log('No name match, fallback to first company:', targetCompanyId);
        }
      } else {
        console.log('SAP company not found for id:', companyId, '- using first company as fallback');
        const { data: fc } = await supabase.from('companies').select('id').limit(1).maybeSingle();
        targetCompanyId = fc?.id;
      }
    }

    if (!targetCompanyId) {
      return { success: false, error: 'No company found to assign branches to', synced: 0, created: 0 };
    }

    for (const wh of sapWarehouses) {
      const whCode = wh.WarehouseCode || wh.WhsCode || null;
      if (!whCode) continue;

      const whName = wh.WarehouseName || wh.WhsName || whCode;
      const isActive = wh.Inactive === 'tNO' || wh.Inactive === false || wh.Inactive == null;

      // Check if branch with this code already exists
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .eq('code', whCode)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabase.from('branches').update({
          name: whName,
          is_active: isActive,
          sap_synced_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (updateErr) {
          console.error('Branch update error for', whCode, ':', updateErr.message);
        } else {
          synced++;
        }
      } else {
        const { error: insertErr } = await supabase.from('branches').insert({
          code: whCode,
          name: whName,
          company_id: targetCompanyId,
          is_active: isActive,
          sap_synced_at: new Date().toISOString(),
        });
        if (insertErr) {
          console.error('Branch insert error for', whCode, ':', insertErr.message);
        } else {
          created++;
        }
      }
    }
  } catch (error) {
    console.error('Error syncing branches:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errMsg, synced, created };
  }

  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

async function syncPriceLists(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  try {
    const sapPriceLists = await sapClient.getPriceLists();
    if (sapPriceLists.length === 0) return { success: true, synced: 0, created: 0, conflicts: [], pushResults: [] };
    for (const pl of sapPriceLists) {
      const record = {
        price_list_code: pl.PriceListNo,
        price_list_name: pl.PriceListName || `Price List ${pl.PriceListNo}`,
        base_price_list: pl.BasePriceList ?? null,
        factor: pl.Factor ?? null,
        currency: pl.DefaultPrimeCurrency || null,
        is_active: pl.IsActive === 'tYES' || pl.IsActive === true || pl.IsActive == null,
        sap_synced_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('price_lists').select('id').eq('price_list_code', record.price_list_code).maybeSingle();
      if (existing) { await supabase.from('price_lists').update(record).eq('id', existing.id); synced++; }
      else { await supabase.from('price_lists').insert(record); created++; }
    }
  } catch (error) {
    console.error('Error syncing price lists:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created };
  }
  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ==================== TAX CODES SYNC ====================
async function syncTaxCodes(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  try {
    const sapTaxCodes = await sapClient.getTaxCodes();
    if (sapTaxCodes.length === 0) return { success: true, synced: 0, created: 0, conflicts: [], pushResults: [] };
    for (const tc of sapTaxCodes) {
      const lines = Array.isArray(tc.VatGroups_Lines)
        ? tc.VatGroups_Lines
        : Array.isArray(tc.VatGroupLines)
          ? tc.VatGroupLines
          : [];

      const lineRate = lines.find((line: any) => line?.Rate != null || line?.TaxRate != null);
      const rawRate = tc.Rate ?? lineRate?.Rate ?? lineRate?.TaxRate ?? 0;
      const rateValue = Number(rawRate) || 0;

      const taxCode = tc.Code || tc.VatCode || null;
      if (!taxCode) continue;

      const record = {
        tax_code: taxCode,
        tax_name: tc.Name || tc.VatName || taxCode,
        rate: rateValue,
        category: tc.Category === 'bovcOutputTax' ? 'Output' : tc.Category === 'bovcInputTax' ? 'Input' : (tc.Category || null),
        account_code: tc.Account || tc.SalesTaxAccount || tc.PurchaseTaxAccount || null,
        is_active: tc.Inactive === 'tNO' || tc.Inactive === false || tc.Inactive == null,
        sap_synced_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('tax_codes').select('id').eq('tax_code', record.tax_code).maybeSingle();
      if (existing) { await supabase.from('tax_codes').update(record).eq('id', existing.id); synced++; }
      else { await supabase.from('tax_codes').insert(record); created++; }
    }
  } catch (error) {
    console.error('Error syncing tax codes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created };
  }
  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ==================== CHART OF ACCOUNTS SYNC ====================
async function syncChartOfAccounts(supabase: any, sapClient: SAPB1Client, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  try {
    const allAccounts: any[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const result = await sapClient.getChartOfAccounts(skip, 2000);
      allAccounts.push(...result.items);
      hasMore = result.hasMore && result.items.length > 0;
      skip += result.items.length;
      // Safety break to prevent infinite loops
      if (skip > 50000) break;
    }
    console.log('Total chart of accounts fetched:', allAccounts.length);
    
    // Build a set of all fetched codes for orphan detection
    const fetchedCodes = new Set(allAccounts.map(a => String(a.Code || a.AcctCode || '')).filter(Boolean));
    
    // Log orphaned parent references BEFORE upsert for debugging
    const orphanedParents: string[] = [];
    for (const a of allAccounts) {
      const parent = String(a.FatherAccountKey || a.FatherAccount || a.FatherNum || '');
      if (parent && !fetchedCodes.has(parent)) {
        orphanedParents.push(`${a.Code||a.AcctCode} -> parent ${parent}`);
      }
    }
    if (orphanedParents.length > 0) {
      console.warn('COA Sync: Missing parent accounts (not returned by SAP):', orphanedParents.slice(0, 20).join(', '));
    }

    // Batch upsert using chunks for efficiency
    const records = allAccounts.map(a => {
      const record: any = {
        acct_code: String(a.Code || a.AcctCode || ''),
        acct_name: a.Name || a.AcctName || a.Code || a.AcctCode || '',
        father_acct_code: a.FatherAccountKey || a.FatherAccount || a.FatherNum || null,
        acct_type: a.AccountType || a.Postable || null,
        acct_level: a.AccountLevel ?? a.Levels ?? a.Level ?? a.HierarchyLevel ?? null,
        balance: a.Balance ?? a.CurrentBalance ?? 0,
        is_active: a.ActiveAccount === 'tYES' || a.ActiveAccount === true || a.Frozen === 'tNO' || a.Frozen === false || a.ActiveAccount == null,
        sap_synced_at: new Date().toISOString(),
      };
      if (companyId) record.company_id = companyId;
      return record;
    }).filter(r => r.acct_code);

    const uniqueRecords = Array.from(new Map(records.map((record) => [record.acct_code, record])).values());

    if (companyId) {
      const chunkSize = 250;

      for (let i = 0; i < uniqueRecords.length; i += chunkSize) {
        const chunk = uniqueRecords.slice(i, i + chunkSize);
        const chunkCodes = chunk.map((record) => record.acct_code);

        const { data: existingRows, error: existingError } = await supabase
          .from('chart_of_accounts')
          .select('acct_code')
          .eq('company_id', companyId)
          .in('acct_code', chunkCodes);

        if (existingError) throw existingError;

        const existingCodes = new Set((existingRows || []).map((row: any) => String(row.acct_code)));

        const { error: upsertError } = await supabase
          .from('chart_of_accounts')
          .upsert(chunk, { onConflict: 'acct_code,company_id' });

        if (upsertError) throw upsertError;

        const updatedCount = chunk.filter((record) => existingCodes.has(record.acct_code)).length;
        synced += updatedCount;
        created += chunk.length - updatedCount;
      }
    } else {
      for (const record of uniqueRecords) {
        let query = supabase.from('chart_of_accounts').select('id').eq('acct_code', record.acct_code);
        const { data: existing, error: existingError } = await query.maybeSingle();
        if (existingError) throw existingError;

        if (existing) {
          const { error: updateError } = await supabase.from('chart_of_accounts').update(record).eq('id', existing.id);
          if (updateError) throw updateError;
          synced++;
        } else {
          const { error: insertError } = await supabase.from('chart_of_accounts').insert(record);
          if (insertError) throw insertError;
          created++;
        }
      }
    }
  } catch (error) {
    console.error('Error syncing chart of accounts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', synced, created };
  }
  return { success: true, synced, created, conflicts: [], pushResults: [] };
}

// ==================== FIXED ASSETS SYNC ====================
const toNumeric = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const firstPositiveNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const num = toNumeric(value);
    if (num > 0) return num;
  }
  return 0;
};

const collectNumericCandidates = (sources: any[], keys: string[]): number[] => {
  const values: number[] = [];
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      values.push(toNumeric(source[key]));
    }
  }
  return values;
};

async function syncFixedAssets(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      // Fetch Fixed Assets from SAP B1 Items endpoint (ItemType = itFixedAssets)
      // Remove restrictive $select to get all fields including depreciation parameters
      const allAssets: any[] = [];
      let skip = 0;
      const pageSize = 100;
      while (allAssets.length < recordLimit) {
        const remaining = recordLimit - allAssets.length;
        // Fetch without $select to get ALL fields including AssetBOMRowCollection, ItemDepreciationParameters, etc.
        const urls = [
          `${sapClient['baseUrl']}/Items?$filter=ItemType eq 'itFixedAssets'&$skip=${skip}&$top=${Math.min(pageSize, remaining)}&$orderby=CreateDate desc`,
          `${sapClient['baseUrl']}/Items?$filter=ItemType eq 'itFixedAssets'&$skip=${skip}&$top=${Math.min(pageSize, remaining)}`,
        ];
        let fetched = false;
        for (const url of urls) {
          try {
            const data = await sapClient['fetchJson']<{ value?: any[]; 'odata.nextLink'?: string }>(url, pageSize);
            const items = data.value || [];
            allAssets.push(...items);
            if (!data['odata.nextLink'] || items.length === 0) { fetched = true; break; }
            skip += items.length;
            fetched = true;
            break;
          } catch (e: any) {
            console.log('Fixed asset URL failed:', url, e.message);
          }
        }
        if (!fetched) {
          // Final fallback
          try {
            const page = await sapClient.getItems(skip, Math.min(pageSize, remaining));
            const faItems = page.items.filter((i: any) => i.ItemType === 'itFixedAssets');
            allAssets.push(...faItems);
            if (!page.hasMore || page.items.length === 0) break;
            skip += page.items.length;
          } catch { break; }
        }
        if (allAssets.length >= recordLimit) break;
      }
      console.log(`Fixed Assets fetched from SAP: ${allAssets.length}`);

      for (const sapAsset of allAssets) {
        const assetCode = sapAsset.ItemCode;
        if (!assetCode) continue;

        const { data: existing, error: existingError } = await supabase
          .from('assets')
          .select('id, asset_code')
          .eq('asset_code', assetCode)
          .maybeSingle();

        if (existingError) {
          pushResults.push({ success: false, entityId: assetCode, entityCode: assetCode, error: existingError.message });
          continue;
        }

        const depParamsRaw = sapAsset.ItemDepreciationParameters || sapAsset.AssetDepreciationParameters || [];
        const depParams = Array.isArray(depParamsRaw) ? depParamsRaw : depParamsRaw ? [depParamsRaw] : [];

        const purchaseCandidates = collectNumericCandidates([...depParams, sapAsset], [
          'APC',
          'APCValue',
          'AcquisitionCost',
          'AcquisitionValue',
          'AssetAcquisitionCost',
          'CapitalizationValue',
          'OriginalCost',
          'TotalUnitsInCostCalculation',
          'PurchaseValue',
          'LastPurPrc',
          'LastPurchasePrice',
          'AvgStdPrice',
          'Price',
        ]);

        const netBookCandidates = collectNumericCandidates([...depParams, sapAsset], [
          'NetBookValue',
          'BookValue',
          'CurrentBookValue',
          'CurrentValue',
          'AssetCurrentValue',
          'RemainingBookValue',
          'RemainingValue',
          'ResidualValue',
        ]);

        const accumulatedDepCandidates = collectNumericCandidates([...depParams, sapAsset], [
          'OrdinaryDepreciation',
          'AccumulatedDepreciation',
          'AccumulatedOrdinaryDepreciation',
          'TotalDepreciation',
          'DepreciationToDate',
          'DepreciationPosted',
        ]);

        const salvageCandidates = collectNumericCandidates([...depParams, sapAsset], [
          'SalvageValue',
          'ResidualValue',
          'RemainingValue',
        ]);

        const usefulLifeCandidates = collectNumericCandidates([...depParams, sapAsset], [
          'UsefulLife',
          'UsefulLifeYears',
          'RemainingUsefulLife',
          'RemainingUsefulLifeYears',
        ]);

        let purchaseValue = firstPositiveNumber(...purchaseCandidates);
        let accumulatedDep = firstPositiveNumber(...accumulatedDepCandidates);
        let currentValue = firstPositiveNumber(...netBookCandidates, purchaseValue - accumulatedDep, purchaseValue);
        let netBookValue = firstPositiveNumber(...netBookCandidates, currentValue);
        let salvageValue = firstPositiveNumber(...salvageCandidates);
        let usefulLife = firstPositiveNumber(...usefulLifeCandidates) || null;

        if (purchaseValue === 0 && currentValue === 0) {
          const fiscalYear = String(new Date().getFullYear());
          const balanceAreas = ['GAAP', 'TAX', 'IFRS'];

          for (const area of balanceAreas) {
            const endBalance = await sapClient.getFixedAssetEndBalance(assetCode, fiscalYear, area);
            if (!endBalance) continue;

            const serviceSources = [
              endBalance,
              endBalance.FixedAssetEndBalance,
              endBalance.AssetEndBalance,
              endBalance.FixedAssetValues,
              endBalance.FixedAssetValues?.FixedAssetEndBalance,
            ].filter(Boolean);

            const servicePurchase = firstPositiveNumber(...collectNumericCandidates(serviceSources, [
              'HistoricalAPC',
              'APC',
              'AcquisitionCost',
              'AssetAcquisitionCost',
              'OriginalCost',
            ]));

            const serviceCurrent = firstPositiveNumber(...collectNumericCandidates(serviceSources, [
              'NetBookValue',
              'BookValue',
              'CurrentValue',
              'CurrentBookValue',
            ]));

            const serviceAccumDep = firstPositiveNumber(...collectNumericCandidates(serviceSources, [
              'AccumulatedDepreciation',
              'OrdinaryDepreciation',
              'TotalDepreciation',
              'DepreciationToDate',
            ]));

            const serviceSalvage = firstPositiveNumber(...collectNumericCandidates(serviceSources, [
              'SalvageValue',
              'ResidualValue',
              'RemainingValue',
            ]));

            const serviceUsefulLife = firstPositiveNumber(...collectNumericCandidates(serviceSources, [
              'UsefulLife',
              'UsefulLifeYears',
              'RemainingUsefulLife',
              'RemainingUsefulLifeYears',
            ]));

            if (servicePurchase > 0 || serviceCurrent > 0) {
              purchaseValue = servicePurchase || purchaseValue;
              accumulatedDep = serviceAccumDep || accumulatedDep;
              currentValue = serviceCurrent || firstPositiveNumber(purchaseValue - accumulatedDep, purchaseValue);
              netBookValue = serviceCurrent || netBookValue || currentValue;
              salvageValue = serviceSalvage || salvageValue;
              usefulLife = serviceUsefulLife || usefulLife;
              break;
            }
          }
        }

        const depMethod =
          depParams.find((d: any) => d?.DepreciationType || d?.DepreciationMethod || d?.Method)?.DepreciationType ||
          depParams.find((d: any) => d?.DepreciationType || d?.DepreciationMethod || d?.Method)?.DepreciationMethod ||
          depParams.find((d: any) => d?.DepreciationType || d?.DepreciationMethod || d?.Method)?.Method ||
          sapAsset.DepreciationType ||
          sapAsset.DepreciationMethod ||
          null;

        const purchaseDate =
          depParams.find((d: any) => d?.CapitalizationDate)?.CapitalizationDate ||
          sapAsset.CapitalizationDate ||
          sapAsset.CreateDate ||
          null;

        const baseRecord: any = {
          name: sapAsset.ItemName || assetCode,
          serial_number: sapAsset.BarCode || sapAsset.SerialNum || null,
          barcode: sapAsset.BarCode || null,
          vendor: sapAsset.Manufacturer || sapAsset.Mainsupplier || null,
          location: sapAsset.DefaultWarehouse || sapAsset.AssetLocation || null,
          purchase_value: purchaseValue,
          current_value: currentValue,
          net_book_value: netBookValue,
          accumulated_depreciation: accumulatedDep,
          salvage_value: salvageValue,
          depreciation_method: depMethod ? String(depMethod) : null,
          useful_life_years: usefulLife,
          purchase_date: purchaseDate,
          department: sapAsset.AssetGroup || (sapAsset.ItemsGroupCode != null ? String(sapAsset.ItemsGroupCode) : null),
          notes: 'Synced from SAP fixed assets',
          company_id: companyId || null,
        };

        let assetId: string | null = null;

        if (existing) {
          assetId = existing.id;
          const { error: updateError } = await supabase
            .from('assets')
            .update(baseRecord)
            .eq('id', existing.id);

          if (updateError) {
            pushResults.push({ success: false, entityId: existing.id, entityCode: assetCode, error: updateError.message });
            continue;
          }
          synced++;
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('assets')
            .insert({
              ...baseRecord,
              asset_code: assetCode,
              status: sapAsset.AssetStatus === 'Retired' ? 'retired' : 'available',
              created_by: userId,
            })
            .select('id')
            .single();

          if (insertError) {
            pushResults.push({ success: false, entityId: assetCode, entityCode: assetCode, error: insertError.message });
            continue;
          }
          assetId = inserted?.id || null;
          created++;
          pushResults.push({ success: true, entityId: inserted?.id || assetCode, entityCode: assetCode });
        }

        // Auto-create capitalization record if purchase value > 0 and no existing capitalization
        if (assetId && purchaseValue > 0) {
          try {
            const { data: existingCap } = await supabase
              .from('asset_capitalizations')
              .select('id')
              .eq('asset_id', assetId)
              .maybeSingle();

            if (!existingCap) {
              await supabase.from('asset_capitalizations').insert({
                asset_id: assetId,
                amount: purchaseValue,
                capitalization_date: purchaseDate || new Date().toISOString().split('T')[0],
                posting_date: purchaseDate || new Date().toISOString().split('T')[0],
                document_number: `SAP-${assetCode}`,
                remarks: `Auto-capitalized from SAP sync`,
                status: 'posted',
                created_by: userId,
              });
            }
          } catch (capErr: any) {
            console.log(`Capitalization record for ${assetCode} skipped:`, capErr.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error syncing fixed assets from SAP:', error);
      return { success: false, error: error.message || 'Unknown error', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts, pushResults };
}

async function fetchSAPCollectionWithFallback(sapClient: SAPB1Client, urls: string[], pageSize: number = 100) {
  let lastError: any = null;
  for (const url of urls) {
    try {
      const data = await sapClient['fetchJson']<{ value?: any[] }>(url, pageSize);
      return data.value || [];
    } catch (e: any) {
      lastError = e;
    }
  }
  throw lastError || new Error('Failed to fetch SAP collection');
}

async function syncServiceOrders(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      const list = await fetchSAPCollectionWithFallback(sapClient, [
        `${sapClient['baseUrl']}/ServiceCalls?$top=${recordLimit}&$orderby=CreationDate desc`,
      ]);

      for (const s of list) {
        const sapId = String(s.ServiceCallID ?? s.CallID ?? s.DocEntry ?? '');
        if (!sapId) continue;
        const orderNumber = s.ServiceCallNumber || s.Subject || `SO-${sapId}`;
        const customerName = s.CustomerName || s.CardName || 'SAP Customer';
        const sapStatus = String(s.Status || s.ServiceCallStatus || 'open').toLowerCase();
        const status = sapStatus.includes('close') ? 'closed' : sapStatus.includes('progress') ? 'in_progress' : sapStatus.includes('assign') ? 'assigned' : 'open';
        const sapPriority = String(s.Priority || 'medium').toLowerCase();
        const priority = ['critical', 'high', 'medium', 'low'].includes(sapPriority) ? sapPriority : 'medium';

        const payload = {
          order_number: orderNumber,
          customer_name: customerName,
          order_type: 'corrective',
          priority,
          status,
          reported_date: s.CreationDate || new Date().toISOString(),
          equipment_number: s.ItemCode || s.InternalSerialNum || null,
          problem_description: s.ProblemDescription || s.Description || s.Subject || null,
          sap_order_id: sapId,
          created_by: userId,
        };

        const { data: existing } = await supabase.from('service_orders').select('id').eq('order_number', orderNumber).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('service_orders').update(payload).eq('id', existing.id);
          if (error) { pushResults.push({ success: false, entityId: existing.id, entityCode: orderNumber, error: error.message }); continue; }
          synced++;
        } else {
          const { error } = await supabase.from('service_orders').insert(payload);
          if (error) { pushResults.push({ success: false, entityId: sapId, entityCode: orderNumber, error: error.message }); continue; }
          created++;
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Service Orders sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

async function syncServiceContracts(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      const list = await fetchSAPCollectionWithFallback(sapClient, [
        `${sapClient['baseUrl']}/ServiceContracts?$top=${recordLimit}&$orderby=CreateDate desc`,
        `${sapClient['baseUrl']}/Contracts?$top=${recordLimit}&$orderby=CreateDate desc`,
      ]);

      for (const c of list) {
        const sapId = String(c.ContractID ?? c.AbsID ?? c.DocEntry ?? '');
        if (!sapId) continue;
        const contractNumber = c.ContractNumber || `SC-${sapId}`;
        const startDate = (c.StartDate || c.CreateDate || new Date().toISOString()).split('T')[0];
        const endDate = (c.EndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()).split('T')[0];

        const payload = {
          contract_number: contractNumber,
          contract_type: 'full_maintenance',
          customer_name: c.CustomerName || c.CardName || 'SAP Customer',
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          contract_value: Number(c.ContractValue ?? c.DocTotal ?? 0) || 0,
          sap_contract_id: sapId,
          notes: c.Remarks || c.Comments || null,
          created_by: userId,
        };

        const { data: existing } = await supabase.from('service_contracts').select('id').eq('contract_number', contractNumber).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('service_contracts').update(payload).eq('id', existing.id);
          if (error) { pushResults.push({ success: false, entityId: existing.id, entityCode: contractNumber, error: error.message }); continue; }
          synced++;
        } else {
          const { error } = await supabase.from('service_contracts').insert(payload);
          if (error) { pushResults.push({ success: false, entityId: sapId, entityCode: contractNumber, error: error.message }); continue; }
          created++;
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Service Contracts sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

async function syncServiceEquipment(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      const list = await fetchSAPCollectionWithFallback(sapClient, [
        `${sapClient['baseUrl']}/CustomerEquipmentCards?$top=${recordLimit}&$orderby=CreateDate desc`,
        `${sapClient['baseUrl']}/EquipmentCards?$top=${recordLimit}&$orderby=CreateDate desc`,
      ]);

      for (const e of list) {
        const sapId = String(e.EquipmentCardNum ?? e.EquipmentCardID ?? e.AbsEntry ?? '');
        const equipmentNumber = e.InternalSerialNum || e.EquipmentCardNum || `EQ-${sapId || Date.now()}`;
        const name = e.ItemDescription || e.ItemName || e.ManufacturerSerialNum || equipmentNumber;

        const payload = {
          equipment_number: equipmentNumber,
          name,
          serial_number: e.ManufacturerSerialNum || e.InternalSerialNum || null,
          model: e.Model || null,
          manufacturer: e.Manufacturer || null,
          customer_name: e.CustomerName || e.CardName || null,
          status: 'active',
          installation_date: e.InstallationDate ? String(e.InstallationDate).split('T')[0] : null,
          warranty_start: e.WarrantyStartDate ? String(e.WarrantyStartDate).split('T')[0] : null,
          warranty_end: e.WarrantyEndDate ? String(e.WarrantyEndDate).split('T')[0] : null,
          sap_equipment_id: sapId || null,
          created_by: userId,
        };

        const { data: existing } = await supabase.from('service_equipment').select('id').eq('equipment_number', equipmentNumber).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('service_equipment').update(payload).eq('id', existing.id);
          if (error) { pushResults.push({ success: false, entityId: existing.id, entityCode: equipmentNumber, error: error.message }); continue; }
          synced++;
        } else {
          const { error } = await supabase.from('service_equipment').insert(payload);
          if (error) { pushResults.push({ success: false, entityId: sapId || equipmentNumber, entityCode: equipmentNumber, error: error.message }); continue; }
          created++;
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Service Equipment sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

async function syncPMPlans(_supabase: any, _sapClient: SAPB1Client, _direction: string, _entityId: string | null, _userId: string, _recordLimit: number = 100) {
  // SAP B1 PM plan endpoint varies by deployment/addons. Keep sync endpoint available without breaking other tabs.
  return { success: true, synced: 0, created: 0, conflicts: [], pushResults: [] };
}

async function syncWarrantyClaims(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      const list = await fetchSAPCollectionWithFallback(sapClient, [
        `${sapClient['baseUrl']}/ServiceCalls?$top=${recordLimit}&$orderby=CreationDate desc`,
      ]);

      for (const w of list) {
        const sapId = String(w.ServiceCallID ?? w.CallID ?? w.DocEntry ?? '');
        if (!sapId) continue;
        const claimNumber = w.ClaimNumber || `WC-${sapId}`;

        const payload = {
          claim_number: claimNumber,
          customer_name: w.CustomerName || w.CardName || null,
          claim_type: 'standard',
          claim_date: (w.CreationDate || new Date().toISOString()).split('T')[0],
          failure_description: w.ProblemDescription || w.Description || w.Subject || null,
          parts_cost: Number(w.PartsCost ?? 0) || 0,
          labor_cost: Number(w.LaborCost ?? 0) || 0,
          total_claim: Number(w.TotalCost ?? 0) || 0,
          status: String(w.Status || 'submitted').toLowerCase().includes('close') ? 'approved' : 'submitted',
          created_by: userId,
        };

        const { data: existing } = await supabase.from('warranty_claims').select('id').eq('claim_number', claimNumber).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('warranty_claims').update(payload).eq('id', existing.id);
          if (error) { pushResults.push({ success: false, entityId: existing.id, entityCode: claimNumber, error: error.message }); continue; }
          synced++;
        } else {
          const { error } = await supabase.from('warranty_claims').insert(payload);
          if (error) { pushResults.push({ success: false, entityId: sapId, entityCode: claimNumber, error: error.message }); continue; }
          created++;
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Warranty Claims sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

// ==================== DELIVERY NOTES SYNC ====================
async function syncDeliveryNotes(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null) {
  let synced = 0;
  let created = 0;
  const conflicts: any[] = [];
  const pushResults: PushResult[] = [];

  if (direction === 'from_sap' || direction === 'bidirectional') {
    try {
      const allDNs: any[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore && allDNs.length < recordLimit) {
        const page = await sapClient.getDeliveryNotes(skip, Math.min(100, recordLimit - allDNs.length));
        allDNs.push(...page.items);
        hasMore = page.hasMore && page.items.length > 0;
        skip += page.items.length;
      }
      console.log(`Delivery Notes fetched from SAP: ${allDNs.length}`);

      for (const sapDN of allDNs) {
        const docEntry = String(sapDN.DocEntry);
        const { data: existing } = await supabase
          .from('delivery_notes')
          .select('id')
          .eq('sap_doc_entry', docEntry)
          .maybeSingle();

        const lines = (sapDN.DocumentLines || []).map((line: any, idx: number) => ({
          line_num: idx + 1,
          item_code: line.ItemCode || '',
          item_description: line.ItemDescription || '',
          quantity: line.Quantity || 0,
          unit_price: line.UnitPrice || line.Price || 0,
          line_total: line.LineTotal || 0,
          warehouse: line.WarehouseCode || '',
          tax_code: line.TaxCode || null,
        }));

        const record: any = {
          doc_num: sapDN.DocNum,
          doc_date: sapDN.DocDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          customer_code: sapDN.CardCode || '',
          customer_name: sapDN.CardName || '',
          total: sapDN.DocTotal || 0,
          currency: sapDN.DocCurrency || 'SAR',
          remarks: sapDN.Comments || null,
          status: 'open',
          sync_status: 'synced',
          sap_doc_entry: docEntry,
          last_synced_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from('delivery_notes').update(record).eq('id', existing.id);
          // Update lines
          await supabase.from('delivery_note_lines').delete().eq('delivery_note_id', existing.id);
          if (lines.length > 0) {
            await supabase.from('delivery_note_lines').insert(lines.map((l: any) => ({ ...l, delivery_note_id: existing.id })));
          }
          synced++;
        } else {
          const { data: inserted } = await supabase.from('delivery_notes').insert({ ...record, created_by: userId, ...(companyId ? { company_id: companyId } : {}) }).select('id').single();
          if (inserted && lines.length > 0) {
            await supabase.from('delivery_note_lines').insert(lines.map((l: any) => ({ ...l, delivery_note_id: inserted.id })));
          }
          created++;
        }
      }
    } catch (error: any) {
      console.error('Error syncing delivery notes from SAP:', error);
      return { success: false, error: error.message || 'Unknown error', synced, created, pushResults };
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    let query = supabase.from('delivery_notes').select('*, delivery_note_lines(*)');
    if (entityId) {
      query = query.eq('id', entityId);
    } else {
      query = query.or('sync_status.is.null,sync_status.neq.synced');
    }
    const { data: localDNs } = await query;

    for (const dn of (localDNs || [])) {
      const pushResult: PushResult = { success: false, entityId: dn.id, entityCode: `DN-${dn.doc_num}` };
      try {
        const lines = (dn.delivery_note_lines || []).map((l: any) => ({
          item_code: l.item_code,
          item_description: l.item_description,
          description: l.item_description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          warehouse: l.warehouse,
          tax_code: l.tax_code,
        }));

        const result = await sapClient.createDeliveryNote(dn, lines);
        if (result.success) {
          pushResult.success = true;
          pushResult.sapDocEntry = result.data?.DocEntry ? String(result.data.DocEntry) : undefined;
          await supabase.from('delivery_notes').update({
            sap_doc_entry: pushResult.sapDocEntry || dn.sap_doc_entry,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }).eq('id', dn.id);
          synced++;
        } else {
          pushResult.error = result.error;
          await supabase.from('delivery_notes').update({ sync_status: 'error' }).eq('id', dn.id);
        }
      } catch (error: any) {
        pushResult.error = error.message || 'Unknown error';
        await supabase.from('delivery_notes').update({ sync_status: 'error' }).eq('id', dn.id);
      }
      pushResults.push(pushResult);
    }
  }

  const failedPushes = pushResults.filter(r => !r.success);
  return { success: failedPushes.length === 0, synced, created, conflicts, pushResults };
}

// ======== USER DEFAULTS SYNC ========
async function syncUserDefaults(supabase: any, sapClient: SAPB1Client, direction: string | null, userId?: string) {
  let synced = 0;
  const pushResults: PushResult[] = [];

  if (!direction || direction === 'from_sap') {
    try {
      const usersResp = await sapClient.get('/Users', '$select=InternalKey,UserCode,UserName,Branch,Department');
      const sapUsers = usersResp?.value || [];
      const { data: userDefaults } = await supabase.from('user_defaults').select('*');
      const existingMap = new Map((userDefaults || []).map((ud: any) => [ud.sap_user_code, ud]));

      for (const sapUser of sapUsers) {
        const sapCode = sapUser.UserCode;
        if (!sapCode) continue;
        const existing = existingMap.get(sapCode);
        if (!existing) continue;

        const updateData: any = {};
        if (sapUser.Branch !== undefined && sapUser.Branch !== null) {
          updateData.default_sales_employee_code = sapUser.Branch;
        }
        if (Object.keys(updateData).length > 0) {
          await supabase.from('user_defaults').update(updateData).eq('id', existing.id);
          synced++;
        }
      }
    } catch (e: any) {
      console.log('User defaults pull skipped:', e.message);
    }
  }

  if (direction === 'to_sap') {
    try {
      const { data: allDefaults } = await supabase.from('user_defaults').select('*').not('sap_user_code', 'is', null);
      for (const ud of (allDefaults || [])) {
        if (!ud.sap_user_code) continue;
        try {
          const sapPayload: any = {};
          if (ud.default_warehouse) {
            sapPayload.Defaults = { DefaultWarehouse: ud.default_warehouse };
          }
          await sapClient.patch(`/Users('${ud.sap_user_code}')`, sapPayload);
          synced++;
          pushResults.push({ success: true, entityId: ud.id, entityCode: ud.sap_user_code });
        } catch (err: any) {
          pushResults.push({ success: false, entityId: ud.id, entityCode: ud.sap_user_code, error: err.message });
        }
      }
    } catch (e: any) {
      console.log('User defaults push failed:', e.message);
    }
  }

  return { success: true, synced, created: 0, conflicts: [], pushResults };
}

// ======== SAP USERS SYNC (to profiles table) ========
async function syncSAPUsers(supabase: any, sapClient: SAPB1Client, direction: string | null, userId?: string, recordLimit: number = 100) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (!direction || direction === 'from_sap' || direction === 'bidirectional') {
    try {
      // Use minimal $select to avoid memory issues
      const usersResp = await sapClient.get('/Users', 'InternalKey,UserCode,UserName,Branch,Department,eMail,MobilePhoneNumber,Locked');
      const sapUsers = usersResp?.value || [];
      console.log(`SAP Users fetched: ${sapUsers.length}`);

      // Fetch existing profiles by sap_user_code
      const sapCodes = sapUsers.map((u: any) => u.UserCode).filter(Boolean);
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, sap_user_code, email')
        .in('sap_user_code', sapCodes.length > 0 ? sapCodes : ['__none__']);
      
      const existingMap = new Map((existingProfiles || []).map((p: any) => [p.sap_user_code, p]));

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      for (const sapUser of sapUsers) {
        const userCode = sapUser.UserCode;
        if (!userCode) continue;

        const existing = existingMap.get(userCode);
        const mappedData: any = {
          sap_user_code: userCode,
          sap_internal_key: sapUser.InternalKey || null,
          full_name: sapUser.UserName || userCode,
          department: sapUser.Department || null,
          phone: sapUser.MobilePhoneNumber || null,
          is_sap_user: true,
          status: sapUser.Locked === 'tYES' ? 'inactive' : 'active',
        };

        if (existing) {
          toUpdate.push({ id: existing.id, data: mappedData });
          synced++;
        } else {
          // Create a real auth user so profile FK is satisfied
          const emailAddr = sapUser.eMail || sapUser.E_Mail || sapUser.Email || '';
          const finalEmail = emailAddr || `${userCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@sap.local`;
          // Generate a random secure password (user won't use it - admin activates later)
          const tempPassword = crypto.randomUUID() + '!Aa1';
          try {
            const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
              email: finalEmail,
              password: tempPassword,
              email_confirm: true,
              user_metadata: { full_name: sapUser.UserName || userCode, is_sap_user: true },
            });
            if (authErr) {
              console.warn(`Could not create auth user for ${userCode} (${finalEmail}): ${authErr.message}`);
            } else if (authUser?.user) {
              // The handle_new_user trigger will create the profile, so we just need to update it
              toUpdate.push({
                id: '__by_user_id__' + authUser.user.id,
                data: { ...mappedData, user_code: userCode, email: finalEmail },
              });
              created++;
            }
          } catch (createErr: any) {
            console.warn(`Auth user creation failed for ${userCode}: ${createErr.message}`);
          }
        }
      }

      // Batch insert
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error } = await supabase.from('profiles').insert(batch);
        if (error) console.error('SAP Users batch insert error:', error.message);
      }

      // Batch update
      for (let i = 0; i < toUpdate.length; i += 20) {
        await Promise.all(toUpdate.slice(i, i + 20).map(({ id, data }) => {
          if (id.startsWith('__by_user_id__')) {
            const userId = id.replace('__by_user_id__', '');
            return supabase.from('profiles').update(data).eq('user_id', userId);
          }
          return supabase.from('profiles').update(data).eq('id', id);
        }));
      }

      console.log(`SAP Users sync: ${created} created, ${synced} updated`);
    } catch (e: any) {
      console.error('SAP Users sync error:', e.message);
      return { success: false, error: e.message || 'SAP Users sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

// ======== BUDGET SYNC ========
async function syncBudgets(supabase: any, sapClient: SAPB1Client, direction: string | null, userId: string | undefined, recordLimit: number, companyId?: string | null) {
  let synced = 0;
  let created = 0;
  const pushResults: PushResult[] = [];

  if (!direction || direction === 'from_sap' || direction === 'bidirectional') {
    try {
      // First try BudgetScenarios to get scenario list
      console.log('Fetching budget scenarios from SAP...');
      let sapScenarios: any[] = [];
      try {
        const scenariosData = await sapClient.getResource<{ value?: any[] }>(`/BudgetScenarios?$top=50`);
        sapScenarios = scenariosData?.value || [];
      } catch (e: any) {
        console.warn('BudgetScenarios endpoint not available:', e.message);
      }
      console.log(`Found ${sapScenarios.length} budget scenarios from SAP`);

      // Try Budgets endpoint
      console.log('Fetching budgets from SAP...');
      let items: any[] = [];
      try {
        const budgetsData = await sapClient.getResource<{ value?: any[] }>(`/Budgets?$top=${recordLimit}`);
        items = budgetsData?.value || [];
      } catch (e: any) {
        console.warn('Budgets endpoint failed:', e.message);
        
        // If Budgets endpoint fails, try syncing just the scenarios
        if (sapScenarios.length > 0) {
          for (const sc of sapScenarios) {
            const scenarioName = sc.Name || sc.Scenario || 'SAP Budget';
            const { data: existing } = await supabase
              .from('budget_scenarios')
              .select('id')
              .eq('name', scenarioName)
              .maybeSingle();
            
            if (!existing) {
              await supabase
                .from('budget_scenarios')
                .insert({ 
                  name: scenarioName, 
                  description: sc.Description || 'Imported from SAP', 
                  is_active: true, 
                  company_id: companyId || null 
                });
              created++;
            }
          }
          console.log(`Budget scenarios synced: ${created} created`);
          return { success: true, synced: 0, created, conflicts: [], pushResults };
        }
        
        return { success: false, error: e.message || 'SAP Budgets endpoint not available', synced, created, pushResults };
      }

      console.log(`Found ${items.length} budget lines from SAP`);
      
      for (const b of items) {
        const accountCode = b.AccountCode || b.Account || '';
        const year = b.FiscalYear || b.Year || new Date().getFullYear();
        const scenarioName = b.BudgetScenario || b.Scenario || 'SAP Budget';
        
        // Ensure scenario exists
        const { data: existingScenario } = await supabase
          .from('budget_scenarios')
          .select('id')
          .eq('name', scenarioName)
          .maybeSingle();
        
        let scenarioId = existingScenario?.id;
        if (!scenarioId) {
          const { data: newScenario } = await supabase
            .from('budget_scenarios')
            .insert({ name: scenarioName, description: 'Imported from SAP', is_active: true, company_id: companyId || null })
            .select('id')
            .single();
          scenarioId = newScenario?.id;
        }
        
        if (!scenarioId) continue;
        
        const budgetLine: Record<string, any> = {
          scenario_id: scenarioId,
          account_code: accountCode,
          account_name: b.AccountName || b.Description || accountCode,
          fiscal_year: year,
          company_id: companyId || null,
        };
        
        // Map monthly periods
        for (let i = 1; i <= 12; i++) {
          budgetLine[`period_${i}`] = Number(b[`Period${i}`] || b[`Month${i}`] || b[`Debit${i}`] || 0);
        }
        
        const { error } = await supabase
          .from('budgets')
          .upsert(budgetLine, { onConflict: 'scenario_id,account_code,fiscal_year' });
        
        if (error) {
          console.warn(`Budget upsert error for ${accountCode}/${year}:`, error.message);
        } else {
          synced++;
        }
      }
      
      console.log(`Budget sync: ${synced} synced`);
    } catch (e: any) {
      console.error('Budget sync error:', e.message);
      return { success: false, error: e.message || 'Budget sync failed', synced, created, pushResults };
    }
  }

  return { success: true, synced, created, conflicts: [], pushResults };
}

// ======== JOURNAL ENTRIES SYNC ========
async function syncJournalEntries(supabase: any, sapClient: SAPB1Client, direction: string, entityId: string | null, userId: string, recordLimit: number = 100, companyId: string | null = null, dateFrom?: string, dateTo?: string, initialSkip: number = 0) {
  const pushResults: PushResult[] = [];
  let synced = 0;
  let created = 0;
  let hasMore = false;
  let nextSkip: number | null = null;
  let totalToSync = 0;

  if (direction === 'from_sap' || direction === 'bidirectional') {
    let skip = Math.max(0, Number(initialSkip) || 0);
    const useDateRange = !!(dateFrom || dateTo);
    // No cap — fetch all records when date range is used or large limit is set
    const effectiveLimit = useDateRange ? 999999 : recordLimit;
    const pageSize = Math.min(200, effectiveLimit);
    let processed = 0;
    console.log(`JE sync: useDateRange=${useDateRange}, dateFrom=${dateFrom}, dateTo=${dateTo}, effectiveLimit=${effectiveLimit}, pageSize=${pageSize}, initialSkip=${skip}`);
    while (processed < effectiveLimit) {
      const currentPageSize = Math.min(pageSize, effectiveLimit - processed);
      const page = await sapClient.getJournalEntries(skip, currentPageSize, dateFrom, dateTo);
      console.log(`Journal entries page fetched: ${page.items.length}, processed: ${processed}, limit: ${effectiveLimit}, hasMore: ${page.hasMore}`);
      if (page.items.length === 0) break;

      const sapDocEntries = page.items.map((sapJE: any) => String(sapJE.JdtNum));
      const { data: existingRows, error: existingError } = await supabase
        .from('journal_entries')
        .select('id, sap_doc_entry')
        .in('sap_doc_entry', sapDocEntries);

      if (existingError) throw existingError;

      const existingBySapDocEntry = new Map(
        (existingRows || []).map((row: any) => [String(row.sap_doc_entry), row.id])
      );

      const inserts: any[] = [];
      const insertLinesBySapDocEntry = new Map<string, any[]>();
      const updates: Array<{ id: string; data: any }> = [];

      for (const sapJE of page.items) {
        const sapDocEntry = String(sapJE.JdtNum);
        const jeLines = sapJE.JournalEntryLines || [];
        const totalDebit = jeLines.reduce((s: number, l: any) => s + (l.Debit || 0), 0);
        const totalCredit = jeLines.reduce((s: number, l: any) => s + (l.Credit || 0), 0);

        const mapped: any = {
          posting_date: sapJE.ReferenceDate,
          due_date: sapJE.DueDate || null,
          reference: sapJE.Reference || null,
          memo: sapJE.Memo || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'posted',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          sap_doc_entry: sapDocEntry,
          erp_doc_entry: sapDocEntry,
          erp_doc_num: String(sapJE.Number || sapJE.JdtNum || ''),
        };

        const existingId = existingBySapDocEntry.get(sapDocEntry);
        if (existingId) {
          // Bulk pull should not re-sync rows that were already imported before.
          // Only allow a targeted manual refresh when a specific entityId is requested.
          if (entityId) {
            updates.push({ id: existingId, data: mapped });
          }
          continue;
        }

        inserts.push({
          ...mapped,
          created_by: userId,
          ...(companyId ? { company_id: companyId } : {}),
        });

        insertLinesBySapDocEntry.set(
          sapDocEntry,
          jeLines.map((l: any, idx: number) => ({
            line_num: idx + 1,
            acct_code: l.AccountCode || l.ShortName || '',
            acct_name: l.AccountName || '',
            debit: l.Debit || 0,
            credit: l.Credit || 0,
            bp_code: l.ShortName !== l.AccountCode ? l.ShortName : null,
            cost_center: l.CostingCode || null,
            project_code: l.ProjectCode || null,
            remarks: l.LineMemo || null,
          }))
        );
      }

      if (inserts.length > 0) {
        const { data: insertedRows, error: insertError } = await supabase
          .from('journal_entries')
          .insert(inserts)
          .select('id, sap_doc_entry');

        if (insertError) throw insertError;

        const linesToInsert = (insertedRows || []).flatMap((row: any) => {
          const lines = insertLinesBySapDocEntry.get(String(row.sap_doc_entry)) || [];
          return lines.map((line) => ({
            journal_entry_id: row.id,
            ...line,
          }));
        });

        for (let i = 0; i < linesToInsert.length; i += 1000) {
          const chunk = linesToInsert.slice(i, i + 1000);
          if (chunk.length === 0) continue;
          const { error: lineInsertError } = await supabase
            .from('journal_entry_lines')
            .insert(chunk);
          if (lineInsertError) throw lineInsertError;
        }

        created += insertedRows?.length || 0;
      }

      for (let i = 0; i < updates.length; i += 20) {
        const batch = updates.slice(i, i + 20);
        await Promise.all(
          batch.map((entry) =>
            supabase.from('journal_entries').update(entry.data).eq('id', entry.id)
          )
        );
      }
      synced += updates.length;

      processed += page.items.length;
      skip += page.items.length;

      if (!page.hasMore || page.items.length < currentPageSize) {
        hasMore = false;
        nextSkip = null;
        break;
      }

      hasMore = true;
      nextSkip = skip;

      // Return after each batch so the frontend can persist and continue
      break;
    }
  }

  if (direction === 'to_sap' || direction === 'bidirectional') {
    const { data: allDimensions } = await supabase.from('dimensions').select('id, cost_center');
    const dimMap: Record<string, string> = {};
    for (const d of allDimensions || []) { dimMap[d.id] = d.cost_center; }

    let query = supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*)')
      .eq('status', 'posted')
      .or('sync_status.eq.pending,sync_status.is.null,sap_doc_entry.is.null');

    if (entityId) query = query.eq('id', entityId);
    if (dateFrom) query = query.gte('posting_date', dateFrom);
    if (dateTo) query = query.lte('posting_date', dateTo);

    const { data: localEntries } = await query;
    const entriesToPush = (localEntries || []).filter((je: any) => !je.sap_doc_entry);
    const alreadySynced = (localEntries || []).filter((je: any) => je.sap_doc_entry);

    // Already-synced entries count as success
    for (const je of alreadySynced) {
      pushResults.push({ success: true, entityId: je.id, entityCode: `JE-${je.doc_num}` });
    }

    console.log(`JE to_sap: ${entriesToPush.length} entries to push (${alreadySynced.length} already synced)`);
    totalToSync = entriesToPush.length;

    // Mark all as processing
    if (entriesToPush.length > 0) {
      const ids = entriesToPush.map((je: any) => je.id);
      await supabase.from('journal_entries').update({ sync_status: 'processing' }).in('id', ids);
    }

    // Process in parallel batches of 5 for speed
    const CONCURRENCY = 5;
    const pushBatchSize = Math.min(limit || 50, 50); // cap per edge function call
    const batch = entriesToPush.slice(0, pushBatchSize);

    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.allSettled(chunk.map(async (je: any) => {
        const pushResult: PushResult = {
          success: false,
          entityId: je.id,
          entityCode: `JE-${je.doc_num}`,
        };
        try {
          const enrichedLines = (je.journal_entry_lines || []).map((l: any) => ({
            ...l,
            _costing_code: l.dim_employee_id ? dimMap[l.dim_employee_id] : null,
            _costing_code2: l.dim_branch_id ? dimMap[l.dim_branch_id] : null,
            _costing_code3: l.dim_business_line_id ? dimMap[l.dim_business_line_id] : null,
            _costing_code4: l.dim_factory_id ? dimMap[l.dim_factory_id] : null,
          }));
          const result = await sapClient.createJournalEntry(je, enrichedLines);
          if (result.success && result.data?.JdtNum) {
            await supabase.from('journal_entries').update({
              sap_doc_entry: String(result.data.JdtNum),
              erp_doc_entry: String(result.data.JdtNum),
              erp_doc_num: String(result.data.Number || result.data.JdtNum || ''),
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }).eq('id', je.id);
            pushResult.success = true;
            pushResult.sapDocEntry = String(result.data.JdtNum);
            synced++;
          } else {
            pushResult.error = result.error;
            await supabase.from('journal_entries').update({ sync_status: 'error' }).eq('id', je.id);
            // Log to error table for visibility
            await supabase.from('sync_error_logs').insert({
              entity_type: 'journal_entry', direction: 'to_sap',
              entity_code: `JE-${je.doc_num}`, error_message: result.error || 'Unknown SAP error',
              company_id: companyId || null,
            }).select().maybeSingle();
          }
        } catch (error) {
          pushResult.error = error instanceof Error ? error.message : 'Unknown error';
          await supabase.from('journal_entries').update({ sync_status: 'error' }).eq('id', je.id);
        }
        return pushResult;
      }));

      for (const r of chunkResults) {
        pushResults.push(r.status === 'fulfilled' ? r.value : { success: false, entityId: '', entityCode: '', error: 'Promise rejected' });
      }
    }

    // If more entries remain beyond this batch, signal hasMore for frontend continuation
    if (entriesToPush.length > pushBatchSize) {
      hasMore = true;
      nextSkip = (skip || 0) + pushBatchSize;
    }
  }

  const hasErrors = pushResults.some(r => !r.success);
  return { success: !hasErrors, synced, created, conflicts: [], pushResults, hasMore, nextSkip, totalToSync };
}
