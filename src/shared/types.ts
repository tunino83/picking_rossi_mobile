export type Role = 'admin' | 'warehouse' | 'orders' | 'orders_closer';

export interface User {
  id: number;
  email: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  role: Role;
  NAME: string;
  twoFactorEnabled?: boolean;
  enabled?: 0 | 1;
  passwordHash?: string;
  WAREHOUSE_CODE?: string;
  WAREHOUSE_NAME?: string;
  WAREHOUSE_COUNTRY?: string;
}

export interface Setting {
  id: string;
  name: string;
  description: string;
  value: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
}

export type ProductStatus = 'da_prendere' | 'preso' | 'non_presente';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  country: string;
}

export interface Order {
  LIST_HEADER_ID: number;
  LIST_TYPE_ID: number;
  LIST_TYPE_DESCRIPTION: string;
  LIST_SUBTYPE_ID: number;
  LIST_SUBTYPE_DESCRIPTION: string;
  LIST_DATE: string; 
  ASSIGNED_USER_ID:number;
  ASSIGNED_USER_NAME:string;
  PORTAL_NOTE: string;
  STATUS: string;
  ROWS_COUNT: number;
  ROWS_IN_5: number;
  ROWS_IN_1: number;
  ROWS: OrderRow[];
  assignedTo?: string; 
    COUNT_ASSIGNED?: number;
  COUNT_UNASSIGNED?: number;
}

export interface TransactionLog {
  TRANSACTION_LOG_ID: number;
  TRANSACTION_TIMESTAMP: string; // oppure Date, se convertito
  PROCESSING_STATUS_CODE: string;
  LIST_BODY_ID: number;
  LIST_HEADER_ID: number;
  LIST_TYPE_ID: number;
  TRANSACTION_TYPE: string;
  TRANSACTION_QUANTITY: number;
  ITEM_CODE: string;
  ITEM_BATCH_CODE: string;
  ITEM_SERIAL_NUMBER: string;
  WAREHOUSE_CODE: string;
  LOCATION_CODE_TO: string;
  DEVICE_CODE: string;
  USER_NAME: string;
  PROCESSING_TIMESTAMP: string; // oppure Date
  CUSTOM_FIELD_1: string;
  CUSTOM_FIELD_2: string;
}



export interface OrderRow {
  LIST_BODY_ID: number;
  LIST_HEADER_ID: number;
  LIST_TYPE_ID: number;
  FLG_READONLY_TRANSACTION: boolean;
  WAREHOUSE_CODE: string;
  WAREHOUSE_NAME: string;
  LOCATION_CODE_FROM: string;
  LOCATION_CODE_FROM_GROUP: string;
  LOCATION_CODE_TO: string;
  ASSEMBLY_LINE_CODE: string;
  ITEM_CODE: string;
  ITEM_SHORT_CODE: string;
  ITEM_DEFAULT_DESCRIPTION: string;
  ITEM_LOCALE_DESCRIPTION_IT: string;
  ITEM_LOCALE_DESCRIPTION_EN: string;
  ITEM_BATCH_CODE: string;
  QUANTITY: number;
  MEASURE_UNIT_CODE: string;
  MEASURE_UNIT_DEFAULT_DEESCRIPTION: string;
  MEASURE_UNIT_LOCALE_DESCRIPTION_IT: string;
  MEASURE_UNIT_LOCALE_DESCRIPTION_EN: string;
  WEIGHT: number;
  WEIGHT_MEASURE_UNIT_CODE: string;
  PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE: string;
  PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE: string;
  PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_NUMBER: string;
  PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_LINE_NUMBER: string;
  KANBAN_CODE: string;
  TRANSFER_DOCUMENT_TYPE: string;
  TRANSFER_DOCUMENT_ORDER_NUMBER: string;
  ASSEMBLY_PROGRAM_NUMBER: string;
  DELIVERY_TERMS_CODE: string;
  DELIVERY_TERMS_DEFAULT_DESCRIPTION: string;
  DELIVERY_TERMS_LOCALE_DESCRIPTION_IT: string;
  DELIVERY_TERMS_LOCALE_DESCRIPTION_EN: string;
  DELIVERY_INSTRUCTIONS: string;
  CUSTOMER_OR_SUPPLIER_CODE: string;
  CUSTOMER_OR_SUPPLIER_NAME: string;
  SHIPPING_LOCATION_CODE: string;
  SHIPPING_LOCATION_NAME: string;
  STATUS: string;
  WORKED_QUANTITY: number;
  DELIVERY_TERMS_DESCRIPTION: string;
  MEASURE_UNIT_DESCRIPTION: string;
  ITEM_DESCRIPTION: string;
  ASSIGNED_USER_ID?: number;
  ASSIGNED_USER_NAME?: string;
  ASSIGNED_TO?: string;


}

