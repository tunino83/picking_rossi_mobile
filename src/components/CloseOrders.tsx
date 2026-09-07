import React, { useState, useEffect } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Truck,
  Info,
} from "lucide-react";
import Swal from "sweetalert2";
import { Order, User, Warehouse as WH } from "../types";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/api";
import { useTranslation } from "react-i18next";

export function CloseOrders() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);


const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(10); 


  const [orders, setOrder] = useState<Order[]>([]); // inizialmente vuoto
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.getOrders({ status: 'NOT COMPLETED' , withDetails: 'NO' }).then(response => {
      
      if (response.orders[0]?.ROWS[0]) {
        console.log("🔍 First row data:", response.orders[0].ROWS[0]);
      }
      setOrder(response.orders);
      setLoading(false);
    });
  }, []);

  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order["STATUS"] | "all">(
    "all"
  );
  const [userFilter, setUserFilter] = useState<
    Order["ASSIGNED_USER_ID"] | "0" | "all"
  >("0");
  
  
  const [confirmedRows, setConfirmedRows] = useState<Record<number, boolean>>({});

  // Carica le conferme gia' salvate (persistenti su DB, per utente)
  useEffect(() => {
    apiClient.getConfirmedRows().then((response) => {
      const initial: Record<number, boolean> = {};
      response.bodyIds.forEach((id) => { initial[id] = true; });
      setConfirmedRows(initial);
    }).catch((error) => {
      console.error("Failed to load confirmed rows:", error);
    });
  }, []);

  // Spunta/togli una riga: aggiornamento ottimistico, con rollback se la chiamata fallisce
  const handleToggleConfirm = async (bodyId: number, checked: boolean) => {
    setConfirmedRows((prev) => ({ ...prev, [bodyId]: checked }));
    try {
      await apiClient.setRowConfirmed(bodyId, checked);
    } catch (error) {
      console.error("Failed to save row confirmation:", error);
      setConfirmedRows((prev) => ({ ...prev, [bodyId]: !checked }));
      alert(t("orders.confirmSaveError", "Impossibile salvare la conferma, riprova."));
    }
  };

  // Conferma/rimuovi conferma su tutte le righe di un ordine in un colpo solo
  const handleToggleConfirmAll = async (order: Order, confirmed: boolean) => {
    const bodyIds = (order.ROWS || []).map((row) => row.LIST_BODY_ID);
    if (bodyIds.length === 0) return;

    setConfirmedRows((prev) => {
      const next = { ...prev };
      bodyIds.forEach((id) => { next[id] = confirmed; });
      return next;
    });

    try {
      await Promise.all(bodyIds.map((id) => apiClient.setRowConfirmed(id, confirmed)));
    } catch (error) {
      console.error("Failed to save all row confirmations:", error);
      // Rollback: ricarica lo stato reale dal server per non restare disallineati
      try {
        const response = await apiClient.getConfirmedRows();
        const reloaded: Record<number, boolean> = {};
        response.bodyIds.forEach((id) => { reloaded[id] = true; });
        setConfirmedRows(reloaded);
      } catch {}
      alert(t("orders.confirmSaveError", "Impossibile salvare la conferma, riprova."));
    }
  };

    async function closeOrder(headerId: number) {
      const result = await Swal.fire({
        title: "Sei sicuro?",
        text: `Stai chiudendo l'ordine ${headerId}. L'operazione è irreversibile.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sì, procedi",
        cancelButtonText: "Annulla",
      });
  
      if (!result.isConfirmed) return;
  
      try {
        await apiClient.addTransactionLog({
          type: "CLOSE_HEADER",
          headerId,
          userEmail: user?.email || "system",
        });
        setOrder(
          orders.map((order) =>
            order.LIST_HEADER_ID === headerId
              ? { ...order, STATUS: "COMPLETED" }
              : order
          )
        );
      } catch (error) {
        console.error("Failed to close order:", error);
      }
    }

  const handleCloseRow = (rowId: number) => {
    // Trova l'ordine da chiudere
    const order = orders.find((o) => o.LIST_HEADER_ID === rowId);
    
    if (!order) {
      alert("Ordine non trovato");
      return;
    }

    // Controlla se tutti i figli (rows) sono confermati
    if (order.ROWS && order.ROWS.length > 0) {
      const allConfirmed = order.ROWS.every((row) => confirmedRows[row.LIST_BODY_ID]);
      
      if (!allConfirmed) {
        alert(t("orders.confirmAllRowsBeforeClose", "Devi confermare tutte le righe prima di chiudere l'ordine"));
        return;
      }
    }

    // Chiama il metodo closeOrder
    closeOrder(rowId);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, userFilter]);


  const handleExpandOrder = async (orderId: number | null) => {
    setExpandedOrder(orderId); // per tenere traccia dell'ordine espanso
    const targetOrder = orders.find((o) => o.LIST_HEADER_ID === orderId);
    if (targetOrder?.ROWS && targetOrder?.ROWS.length > 0) return; // Già caricato

    if (orderId !== null) {
      const fullOrder = await apiClient.getOrderById(orderId);

      // aggiorna l'ordine nella lista con i dettagli completi
      setOrder((prevOrders) =>
        prevOrders.map((order) =>
          order.LIST_HEADER_ID === orderId ? { ...order, ...fullOrder } : order
        )
      );
    }
  };

  const reloadOrders = async () => {
    const response = await apiClient.getOrders();
    setOrder(response.orders);
  };

  const statusIcons = {
    "NOT STARTED": Clock,
    "IN PROGRESS": Package,
    COMPLETED: CheckCircle,
  };

  const filteredOrders = orders.filter((order) => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      // Cerca in tutti gli attributi dell'oggetto order
      Object.values(order).some((value) =>
        String(value).toLowerCase().includes(lowerSearch)
      ) ||
      // Cerca in tutte le righe di order.ROWS
      (order.ROWS || []).some((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(lowerSearch)
        )
      );

    const matchesStatus =
      statusFilter === "all" || order.STATUS === statusFilter;
    return matchesSearch && matchesStatus  ;
  });

// Calcola gli indici per la paginazione
const startIndex = (currentPage - 1) * rowsPerPage;
const endIndex = startIndex + rowsPerPage;
const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);

// Calcola il numero totale di pagine per i controlli di paginazione
const totalPages =  Math.ceil(filteredOrders.length / rowsPerPage);



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
    </div>
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


</div>
          </div>
        </div>
          
          <div className="relative overflow-x-auto">
            <div className="inline-block min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                    {t("common.close_list")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersToDisplay.map((order) => (
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
                        <div className="flex items-center gap-2">
                          {(() => {
                            const allChildrenConfirmed = order.ROWS && order.ROWS.length > 0
                              ? order.ROWS.every((row) => confirmedRows[row.LIST_BODY_ID])
                              : false;
                            const confirmedCount = order.ROWS 
                              ? order.ROWS.filter((row) => confirmedRows[row.LIST_BODY_ID]).length 
                              : 0;
                            const totalCount = order.ROWS ? order.ROWS.length : 0;
                            return (
                              <button
                                onClick={() => handleCloseRow(order.LIST_HEADER_ID)}
                                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                  allChildrenConfirmed
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                                disabled={!allChildrenConfirmed}
                              >
                                {t("common.close_list")} ({confirmedCount}/{totalCount})
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                    {expandedOrder === order.LIST_HEADER_ID && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {t("orders.rows")}
                              </h4>
                              {order.ROWS && order.ROWS.length > 0 && (() => {
                                const allChildrenConfirmed = order.ROWS.every((row) => confirmedRows[row.LIST_BODY_ID]);
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConfirmAll(order, !allChildrenConfirmed)}
                                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                      allChildrenConfirmed
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                  >
                                    {allChildrenConfirmed ? t("common.removeConfirmAll", "Rimuovi conferma tutti") : t("common.confirmAll", "Conferma tutti")}
                                  </button>
                                );
                              })()}
                            </div>
                            <div className="grid gap-4">
                              {order.ROWS ? (
                                order.ROWS.map((orderRow) => (
                                  <div
                                    key={orderRow.LIST_BODY_ID}
                                    className="grid grid-cols-4 gap-2 bg-white p-2 rounded-md shadow-sm"
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
                                    {/* PRIMA RIGA: Status + Locations + Checkbox */}

                                    <div className="flex items-center space-x-2">

                                      <div>
                                        <p  className="text-xs font-medium">ASSEMBLY ORDER #:{orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_NUMBER}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <div>
                                        <p  className="text-xs font-medium">From: {orderRow.LOCATION_CODE_FROM}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <div>
                                        <p  className="text-xs font-medium">To: {orderRow.LOCATION_CODE_TO}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
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
                                        >  {orderRow.STATUS} - &nbsp; 
                                          {React.createElement(
                                            statusIcons["IN PROGRESS"],
                                            {
                                              className: "mr-1 h-4 w-4",
                                            }
                                          )}
                                          {orderRow.WORKED_QUANTITY}/{orderRow.QUANTITY}
                                        </p>
                                      </div>
                                    </div>


                                    {/* SECONDA RIGA: Item + Delivery + Other info */}
                                      <div className="flex items-start space-x-2">
                                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                                        <div>
                                          <p className="text-xs font-medium">ITEM: {orderRow.ITEM_CODE}</p>
                                          <p className="text-xs text-gray-500">{orderRow.ITEM_DESCRIPTION}</p>
                                          <p className="text-xs text-gray-500">Qty: {orderRow.QUANTITY} {orderRow.MEASURE_UNIT_DESCRIPTION}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-start space-x-2">
                                        <Truck className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                                        <div>
                                          <p className="text-xs font-medium">Delivery</p>
                                          {orderRow.DELIVERY_TERMS_CODE && <p className="text-xs text-gray-500">Terms: {orderRow.DELIVERY_TERMS_CODE}</p>}
                                          {orderRow.DELIVERY_INSTRUCTIONS && <p className="text-xs text-gray-500">{orderRow.DELIVERY_INSTRUCTIONS}</p>}
                                        </div>
                                      </div>

                                      <div className="flex items-start space-x-2">
                                        <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                                        <div>
                                          <p className="text-xs font-medium">Other Info</p>
                                          {orderRow.CUSTOMER_OR_SUPPLIER_CODE && <p className="text-xs text-gray-500">Supplier: {orderRow.CUSTOMER_OR_SUPPLIER_CODE}</p>}
                                          {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE && <p className="text-xs text-gray-500">Company: {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE}</p>}
                                          {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE && <p className="text-xs text-gray-500">Order Type: {orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE}</p>}
                                          {orderRow.TRANSFER_DOCUMENT_TYPE && <p className="text-xs text-gray-500">Doc Type: {orderRow.TRANSFER_DOCUMENT_TYPE}</p>}
                                          {orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER != null && orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER !== "0" && <p className="text-xs text-gray-500">Transfer Order Number: {orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER}</p>}
                                        </div>
                                      </div>

                                        <div className="flex items-start" style={{ justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleConfirm(orderRow.LIST_BODY_ID, !confirmedRows[orderRow.LIST_BODY_ID])}
                                            title="Conferma prima di chiudere"
                                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                              confirmedRows[orderRow.LIST_BODY_ID]
                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                            }`}
                                        >
                                            {confirmedRows[orderRow.LIST_BODY_ID] ? t("common.removeConfirm", "Rimuovi conferma") : t("common.confirm")}
                                        </button>
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
               </div>
          </div>
          
          {/* Controlli di paginazione - Comuni a entrambe le visualizzazioni */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Precedente
            </button>
            
            <span className="text-sm text-gray-700">
              Pagina <span className="font-medium">{currentPage}</span> di <span className="font-medium">{totalPages}</span>
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Successiva
            </button>
          </div>
      </>
    )}
    </div>
  );
}
