      // OrderList removed for mobile application.
      // Kept as a small stub to avoid accidental import errors during transition.
      import React from "react";

      export function OrderList() {
        return null; // no UI on mobile
      }
      key: "ASSEMBLY_LINE_CODE",
      label: t("orders.ASSEMBLY_LINE_CODE"),
      defaultVisible: false,
    },
    {
      key: "CUSTOMER_OR_SUPPLIER_CODE",
      label: t("orders.CUSTOMER_OR_SUPPLIER_CODE"),
      defaultVisible: false,
    },
    {
      key: "CUSTOMER_OR_SUPPLIER_NAME",
      label: t("orders.CUSTOMER_OR_SUPPLIER_NAME"),
      defaultVisible: false,
    },
    {
      key: "DELIVERY_TERMS_CODE",
      label: t("orders.DELIVERY_TERMS_CODE"),
      defaultVisible: false,
    },
    {
      key: "DELIVERY_TERMS_DEFAULT_DESCRIPTION",
      label: t("orders.DELIVERY_TERMS_DEFAULT_DESCRIPTION"),
      defaultVisible: false,
    },
    {
      key: "ASSIGNED_TO",
      label: t("orders.ASSIGNED_TO"),
      defaultVisible: true,
    },
  ];

  // Usa defaultVisible per le colonne visibili di default
  const defaultVisible = allColumns
    .filter((col) => col.defaultVisible)
    .map((col) => col.key);
  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(defaultVisible);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  function safeCellValue(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }

  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const filtraRigheDinamico = (row, columnFilters) => {
  // Ottieni un array delle chiavi dei filtri attivi
  const filterKeys = Object.keys(columnFilters);

  // Per ogni chiave di filtro, controlla se la riga ha un valore corrispondente
  return filterKeys.every(key => {
    const filterValue = columnFilters[key];
    const rowValue = row[key];

    // Se il valore della riga non è definito, il filtro fallisce
    if (rowValue === undefined || rowValue === null) {
      return false;
    }

    // Confronto, convertendo tutto in minuscolo per una ricerca non sensibile alle maiuscole
    return String(rowValue).toLowerCase().includes(String(filterValue).toLowerCase());
  });
};

// Calcola l'array di tutte le righe filtrate
const filteredRows = filteredOrders
  .flatMap((order) =>
    (order.ROWS || []).map((row) => ({
      ...order,
      ...row,
    }))
  )
  .filter((row) => {
    const matchesColumns = filtraRigheDinamico(row, columnFilters);

    // Filtro per utente assegnato
    const matchesUserFilter =
      userFilter === "all"
        ? true
        : row.ASSIGNED_USER_ID == userFilter ||
          (userFilter == "0" && !row.ASSIGNED_USER_ID);

    return matchesColumns && matchesUserFilter;
  });

// Calcola gli indici per la paginazione
const startIndex = (currentPage - 1) * rowsPerPage;
const endIndex = startIndex + rowsPerPage;

// Crea l'array finale di righe da visualizzare sulla pagina corrente
const rowsToDisplay = filteredRows.slice(startIndex, endIndex);

// Calcola il numero totale di pagine per i controlli di paginazione
const totalPages = Math.ceil(filteredRows.length / rowsPerPage);



  return (
    <div className="bg-white shadow rounded-lg">
      {loading ? (
      <div className="flex justify-center items-center h-32">
        <span className="text-gray-500 text-lg">Loading orders...</span>
        {/* Puoi aggiungere uno spinner qui */}
      </div>
    ) : (
      <>
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {t("orders.title")}
            </h3>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span
                className={
                  viewMode === "order"
                    ? "font-semibold text-blue-700"
                    : "text-gray-500"
                }
              >
                {t("common.orders")}
              </span>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  viewMode === "rows" ? "bg-blue-600" : "bg-gray-300"
                }`}
                onClick={() =>
                  setViewMode(viewMode === "order" ? "rows" : "order")
                }
                aria-pressed={viewMode === "rows"}
                aria-label="Toggle visualizzazione"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    viewMode === "rows" ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={
                  viewMode === "rows"
                    ? "font-semibold text-blue-700"
                    : "text-gray-500"
                }
              >
                {t("common.order_rows")}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
  <div className="flex flex-col">
    <label htmlFor="status-filter" className="text-xs text-gray-600 mb-1">{t("common.search")}</label>
    <div className="relative w-full sm:w-64">
      <input
        id="search-orders"
        type="text"
        placeholder="Search orders..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="user-filter" className="text-xs text-gray-600 mb-1">{t("orders.assignedTo")}</label>
    <select
      id="user-filter"
      value={userFilter}
      onChange={(e) =>
        setUserFilter(e.target.value as Order["ASSIGNED_USER_ID"] | "0")
      }
      className="w-full sm:w-auto rounded-lg border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="0">{t("orders.unassigned")}</option>
      <option value="all">{t("orders.status.all")}</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.NAME}
        </option>
      ))}
    </select>
  </div>
  <div className="flex flex-col">
    <label htmlFor="status-filter" className="text-xs text-gray-600 mb-1">{t("orders.listStatus")}</label>
    <select
      id="status-filter"
      value={statusFilter}
      onChange={(e) =>
        setStatusFilter(e.target.value as Order["STATUS"] | "all")
      }
      className="w-full sm:w-auto rounded-lg border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="all">{t("orders.status.all")}</option>
      <option value="pending">{t("orders.status.pending")}</option>
      <option value="processing">
        {t("orders.status.processing")}
      </option>
      <option value="completed">{t("orders.status.completed")}</option>
    </select>
  </div>
  <div className="flex flex-col">
    <label htmlFor="rows-per-page" className="text-xs text-gray-600 mb-1">
      {t("common.rows_per_page")}
    </label>
    <select
      id="rows-per-page"
      value={rowsPerPage}
      onChange={e => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
      }}
      className="w-full sm:w-auto rounded-lg border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {[10, 25, 50, 100, 200].map(num => (
        <option key={num} value={num}>{num}</option>
      ))}
    </select>
  </div>

{viewMode === "rows" && (
  <div className="flex flex-col justify-end">    
    <label className="text-xs text-gray-600 mb-1 invisible">Colonne</label>
    <button
      type="button"
      className="flex items-center gap-1 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow"
      onClick={() => setShowColumnSelector((prev) => !prev)}
      title={showColumnSelector ? "Nascondi selettore colonne" : "Mostra selettore colonne"}
      style={{ minHeight: 40 }}
    >
      <Eye className="h-5 w-5" />
    </button>
  </div>
  
)}
{viewMode === "rows" && (
    <div className="flex flex-col justify-end">    
      <button
      type="button"
      className={`flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white font-semibold shadow transition-colors
        ${selectedRows.length > 0  ? "hover:bg-green-700" : "opacity-50 cursor-not-allowed"}`}
      disabled={selectedRows.length === 0 }
      onClick={() => {
        setOrderItemToAssign(selectedRows);
        setUserAssignFrom("row");
        setShowAssignModal(true);
      }}
    >
      <UserPlus className="h-5 w-5" />
    </button>
  </div>

  
)}

</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-center mb-3 gap-3">
                    {showAssignModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
                          <h4 className="text-md font-semibold mb-2">
                            Assegna item
                          </h4>
                          <p className="text-xs text-gray-700 mb-4">
                            Stai assegnando questi item ad un operatore.
                            <br />
                            <span className="font-semibold text-red-600">
                              Se l'item era già assegnato verrà sovrascritto.
                            </span>
                          </p>
                          <select
                            className="w-full mb-4 rounded border border-gray-300 px-2 py-1 text-sm"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                          >
                            <option value="">Seleziona operatore...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.LAST_NAME} {user.FIRST_NAME}
                              </option>
                            ))}
                          </select>
                          <div className="flex justify-end gap-2">
                            <button
                              className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs"
                              onClick={() => {
                                setUserAssignFrom(""),
                                setShowAssignModal(false);
                                setOrderItemToAssign([]);
                              }}
                            >
                              Annulla
                            </button>
                            <button
                              className={`px-3 py-1 rounded text-xs font-semibold ${
                                selectedUserId
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                              }`}
                              disabled={!selectedUserId}
                              onClick={async () => {
                                await apiClient.assignOrderRows(
                                  userAssignFrom === "row" ? selectedRows : orderItemToAssign,
                                  parseInt(selectedUserId)
                                );
                                setOrder(prevOrders =>
                                  prevOrders.map(order => ({
                                    ...order,
                                    ROWS: order.ROWS
                                      ? order.ROWS.map(row => {
                                          // Se l'assegnazione arriva dalla vista "row" usa selectedUserId, altrimenti usa orderItemToAssign
                                          const isAssigned =
                                            userAssignFrom === "row"
                                              ? selectedRows.includes(row.LIST_BODY_ID)
                                              : orderItemToAssign.includes(row.LIST_BODY_ID);

                                          return isAssigned
                                            ? {
                                                ...row,
                                                ASSIGNED_TO:
                                                  users.find(u => String(u.id) === String(selectedUserId))?.NAME || ""
                                              }
                                            : row;
                                      })
                                      : order.ROWS,
                                  }))
                                );
                                setUserAssignFrom(""),
                                setShowAssignModal(false);
                                setOrderItemToAssign([]);
                              }}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
          {viewMode === "order" ? (
            // --- VISUALIZZAZIONE ORDINI (già presente) ---
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-8 px-4 py-3"></th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("common.order")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("common.status")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("common.order_rows")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("orders.LIST_DATE")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("orders.ASSIGNED_COUNT")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("orders.UNASSIGNED_COUNT")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <React.Fragment key={order.LIST_HEADER_ID}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            handleExpandOrder(
                              expandedOrder === order.LIST_HEADER_ID
                                ? null
                                : order.LIST_HEADER_ID
                            )
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedOrder === order.LIST_HEADER_ID ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.LIST_HEADER_ID}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.LIST_TYPE_DESCRIPTION} - {order.LIST_SUBTYPE_ID}{" "}
                          - {order.LIST_SUBTYPE_DESCRIPTION}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{
                            backgroundColor:
                              order.STATUS === "COMPLETED"
                                ? "#DEF7EC"
                                : order.STATUS === "IN PROGRESS"
                                ? "#E1EFFE"
                                : "#FEF3C7",
                            color:
                              order.STATUS === "COMPLETED"
                                ? "#03543F"
                                : order.STATUS === "IN PROGRESS"
                                ? "#1E429F"
                                : "#92400E",
                          }}
                        >
                          {React.createElement(
                            statusIcons[order.STATUS as keyof typeof statusIcons],
                            {
                              className: "mr-1 h-4 w-4",
                            }
                          )}
                          {order.STATUS}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {order.ROWS_IN_5}/{order.ROWS_COUNT}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(order.LIST_DATE).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {order.COUNT_ASSIGNED}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {order.COUNT_UNASSIGNED}
                      </td>
                    </tr>
                    {expandedOrder === order.LIST_HEADER_ID && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              Items
                            </h4>
                            <div className="grid gap-4">
                              {order.ROWS ? (
                                order.ROWS.map((orderRow) => (
                                  <div
                                    key={orderRow.LIST_BODY_ID}
                                    className="grid grid-cols-2 gap-4 bg-white p-3 rounded-md shadow-sm"
                                    style={{
                                      border: `3px solid ${
                                        orderRow.STATUS === "COMPLETED"
                                          ? "#DEF7EC"
                                          : orderRow.STATUS === "IN PROGRESS"
                                          ? "#E1EFFE"
                                          : "#FEF3C7"
                                      }`,
                                      borderRadius: "0.375rem",
                                    }}
                                  >
                                    <div className="flex items-center space-x-4">
                                      <UserIcon className="h-5 w-5 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">
                                          {orderRow.ASSIGNED_TO || "Unassigned"}
                                        </p>
                                        {orderRow.ASSIGNED_TO == "" ||
                                          ((!orderRow.ASSIGNED_TO  || orderRow.ASSIGNED_TO == "") && (
                                            <button
                                              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold shadow transition-colors
                                                  bg-green-600 hover:bg-green-700
                                                  `}
                                              onClick={() =>{
                                                setOrderItemToAssign([orderRow.LIST_BODY_ID]);
                                                setUserAssignFrom("order"),
                                                setShowAssignModal(true)
                                                }
                                              }
                                            >
                                              <UserPlus className="h-5 w-5 mr-1" />
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div>
                                        <p
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                                          style={{
                                            backgroundColor:
                                              orderRow.STATUS === "COMPLETED"
                                                ? "#DEF7EC"
                                                : order.STATUS === "IN PROGRESS"
                                                ? "#E1EFFE"
                                                : "#FEF3C7",
                                            color:
                                              orderRow.STATUS === "COMPLETED"
                                                ? "#03543F"
                                                : orderRow.STATUS ===
                                                  "IN PROGRESS"
                                                ? "#1E429F"
                                                : "#92400E",
                                          }}
                                        >
                                          {React.createElement(
                                            statusIcons["IN PROGRESS"],
                                            {
                                              className: "mr-1 h-4 w-4",
                                            }
                                          )}
                                          {orderRow.STATUS}{" "}
                                          {orderRow.WORKED_QUANTITY} /{" "}
                                          {orderRow.QUANTITY}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                      <Warehouse className="h-5 w-5 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">
                                          WAREHOUSE: {orderRow.WAREHOUSE_NAME}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Warehouse code:{" "}
                                          {orderRow.WAREHOUSE_CODE}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          From: {orderRow.LOCATION_CODE_FROM}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          To: {orderRow.LOCATION_CODE_TO}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                      <Package className="h-5 w-5 text-gray-400" />

                                      <div>
                                        <p className="text-sm font-medium">
                                          ITEM CODE :{orderRow.ITEM_CODE}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Short Code: {orderRow.ITEM_SHORT_CODE},
                                          Description {orderRow.ITEM_DESCRIPTION},
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Quantity: {orderRow.QUANTITY}{" "}
                                          {orderRow.MEASURE_UNIT_DESCRIPTION} |
                                          Weight: {orderRow.WEIGHT}{" "}
                                          {orderRow.WEIGHT_MEASURE_UNIT_CODE}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <Truck className="h-5 w-5 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">
                                          Delivery Info:
                                        </p>

                                        {orderRow.DELIVERY_TERMS_CODE && (
                                          <p className="text-xs text-gray-500">
                                            Delivery Terms Code:{" "}
                                            {orderRow.DELIVERY_TERMS_CODE}
                                          </p>
                                        )}
                                        {orderRow.DELIVERY_TERMS_DESCRIPTION && (
                                          <p className="text-xs text-gray-500">
                                            Delivery Terms Description:{" "}
                                            {orderRow.DELIVERY_TERMS_DESCRIPTION}
                                          </p>
                                        )}
                                        {orderRow.DELIVERY_TERMS_DESCRIPTION && (
                                          <p className="text-xs text-gray-500">
                                            Delivery Terms EN:{" "}
                                            {orderRow.DELIVERY_TERMS_DESCRIPTION}
                                          </p>
                                        )}
                                        {orderRow.DELIVERY_INSTRUCTIONS && (
                                          <p className="text-xs text-gray-500">
                                            Delivery Instructions:{" "}
                                            {orderRow.DELIVERY_INSTRUCTIONS}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <Info className="h-5 w-5 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">
                                          Other Info:
                                        </p>
                                        {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE && (
                                          <p className="text-xs text-gray-500">
                                            Company Code:{" "}
                                            {
                                              orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE
                                            }
                                          </p>
                                        )}
                                        {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE && (
                                          <p className="text-xs text-gray-500">
                                            Order Type:{" "}
                                            {
                                              orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE
                                            }
                                          </p>
                                        )}
                                        {orderRow.TRANSFER_DOCUMENT_TYPE && (
                                          <p className="text-xs text-gray-500">
                                            Document Type:{" "}
                                            {orderRow.TRANSFER_DOCUMENT_TYPE}
                                          </p>
                                        )}
                                        {orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER !=
                                          null &&
                                          orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER !==
                                            "0" && (
                                            <p className="text-xs text-gray-500">
                                              Transfer Order Number:{" "}
                                              {
                                                orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER
                                              }
                                            </p>
                                          )}
                                        {(orderRow.CUSTOMER_OR_SUPPLIER_CODE ||
                                          orderRow.CUSTOMER_OR_SUPPLIER_NAME) && (
                                          <p className="text-xs text-gray-500">
                                            Customer/Supplier Code/Name:{" "}
                                            {orderRow.CUSTOMER_OR_SUPPLIER_CODE}/
                                            {orderRow.CUSTOMER_OR_SUPPLIER_NAME}
                                          </p>
                                        )}
                                        {(orderRow.SHIPPING_LOCATION_CODE ||
                                          orderRow.SHIPPING_LOCATION_NAME) && (
                                          <p className="text-xs text-gray-500">
                                            Shipping Location Code/Name:{" "}
                                            {orderRow.SHIPPING_LOCATION_CODE} /{" "}
                                            {orderRow.SHIPPING_LOCATION_NAME}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/*<select
                                    className={`text-sm rounded-md border-0 ${productStatusColors[orderRow.status]}`}
                                    value={orderRow.status}
                                    onChange={(e) => updateProductStatus(order.id, orderRow.id, e.target.value as ProductStatus)}
                                    disabled={user?.role !== 'warehouse' && user?.role !== 'admin'}
                                  >
                                    <option value="da_prendere">Da Prendere</option>
                                    <option value="preso">Preso</option>
                                    <option value="non_presente">Non Presente</option>
                                  </select >*/}
                                  </div>
                                ))
                              ) : (
                                <p>Loading Details</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            // --- VISUALIZZAZIONE RIGHE ORDINI ---
            <>
              {viewMode === "rows"  && (
                <>
                  
                  {showColumnSelector && (
                    <div className="mb-4 flex flex-wrap gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                      {allColumns.map((col) => (
                        <label
                          key={col.key}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors
                ${
                  visibleColumns.includes(col.key)
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-white text-gray-700"
                }`}
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => {
                              setVisibleColumns((prev) =>
                                prev.includes(col.key)
                                  ? prev.filter((k) => k !== col.key)
                                  : [...prev, col.key]
                              );
                            }}
                            className="accent-blue-600"
                          />
                          <span className="text-xs">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {/* Seleziona tutte */}
                      <input
                        type="checkbox"
                        checked={
                          rowsToDisplay.flatMap((order) => order.ROWS || [])
                            .length > 0 &&
                          rowsToDisplay
                            .flatMap((order) => order.ROWS || [])
                            .every((row) =>
                              selectedRows.includes(row.LIST_BODY_ID)
                            )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(
                              rowsToDisplay
                                .flatMap((order) => order.ROWS || [])
                                .map((row) => row.LIST_BODY_ID)
                            );
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </th>
                    {allColumns
                      .filter((col) => visibleColumns.includes(col.key))
                      .map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          <div>
                            {col.label}
                            <input
                              type="text"
                              value={columnFilters[col.key] || ""}
                              onChange={(e) =>
                                setColumnFilters((f) => ({
                                  ...f,
                                  [col.key]: e.target.value,
                                }))
                              }
                              placeholder="Filtro"
                              className="mt-1 w-full border rounded px-1 py-0.5 text-xs"
                            />
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {
                    rowsToDisplay.map((row) => (
                      <tr key={row.LIST_BODY_ID}>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row.LIST_BODY_ID)}
                            onChange={(e) => {

                              setSelectedRows((prev) =>
                                e.target.checked
                                  ? [...prev, row.LIST_BODY_ID]
                                  : prev.filter((id) => id !== row.LIST_BODY_ID)
                              );
                            }}
                          />
                        </td>
                        {allColumns
                          .filter((col) => visibleColumns.includes(col.key))
                          .map((col) => (
                            <td
                              key={col.key}
                              className="px-4 py-4 text-sm text-gray-500"
                            >
                              {col.key in row
                                ? safeCellValue(row[col.key as keyof OrderRow])
                                :  ""}
                            </td>
                          ))}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
                  {/* Controlli di paginazione */}
                <div class="flex items-center justify-center mt-6 space-x-4">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Precedente
                  </button>
                  
                  <span class="text-sm text-gray-700">
                    Pagina <span class="font-medium">{currentPage}</span> di <span class="font-medium">{totalPages}</span>
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Successiva
                  </button>
                </div>
                <div className="flex items-center justify-center mt-4">
    
</div>
            </>
          )}
        </div>
      </>
    )}
    </div>
  );
}
