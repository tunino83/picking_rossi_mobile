import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Package,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Truck,
  Info,
  ListTodo,
  QrCode,
  Upload,
  BaggageClaim,
  User as UserIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";

import { useBreakpoint } from "../hooks/useBreakpoint";
import { Order, OrderRow, User } from "../types";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/api";

export function MyOrderList() {
  const { t } = useTranslation();
  const MyUserId = useAuthStore((state) => state.user?.id);
  const [orders, setOrder] = useState<Order[]>([]); // inizialmente vuoto

  // Controlla se il debug panel è abilitato nel DB
  useEffect(() => {
    async function checkDebugSetting() {
      try {
        const response = await apiClient.getSettingByName('enableMobileDebug');
        // Se la chiamata ha successo, controlla il valore
        if (response?.setting?.value === 'Y') {
          setDebugEnabled(true);
          console.log('🟢 Debug panel ENABLED from DB');
        } else {
          setDebugEnabled(false);
          console.log('🔴 Debug panel DISABLED (value is not Y)');
        }
      } catch (error: any) {
        // Se è 404, il setting non esiste (è ok, debug disabled)
        if (error?.response?.status === 404) {
          console.log('🔴 Debug panel DISABLED (setting not found in DB)');
          setDebugEnabled(false);
        } else {
          // Errore vero
          console.warn('⚠️ Error fetching debug setting:', error);
          setDebugEnabled(false);
        }
      }
    }
    checkDebugSetting();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await apiClient.getMyOrders();
        setOrder(response.orders); // prendiamo solo la lista di ordini
      } catch (error) {
        console.error("Failed to fetch order list:", error);
      }
    }

    fetchOrders();
  }, []);

  const handleExpandOrder = async (orderId: number | null) => {
      setExpandedOrder(orderId); // per tenere traccia dell'ordine espanso
      const targetOrder = orders.find(o => o.LIST_HEADER_ID === orderId);
      if (targetOrder?.ROWS && targetOrder?.ROWS.length > 0) return; // Già caricato
  
      if(orderId !== null) {
        const fullOrder = await apiClient.getOrderById(orderId);
          
        // aggiorna l’ordine nella lista con i dettagli completi
        setOrder(prevOrders =>
          prevOrders.map(order =>
            order.LIST_HEADER_ID === orderId ? { ...order, ...fullOrder } : order
          )
        );
      }
    };
  

  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderRowsMap, setOrderRowsMap] = useState<Record<number, OrderRow[]>>(
    {}
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Order["STATUS"] | "all">(
    "NOT COMPLETED" // Filtro iniziale: mostra tutti gli ordini non completati
  );
  const [viewMode, setViewMode] = useState<"order" | "warehouse">("order");
  // Navigazione a singolo articolo dopo una scansione: chiavi (non le righe stesse, per restare
  // sempre aggiornati rispetto a "orders" dopo chiusure/caricamenti) delle righe che matchano
  // l'ITEM_CODE scansionato, su tutti gli ordini.
  const [scannedItemKeys, setScannedItemKeys] = useState<{ headerId: number; bodyId: number }[] | null>(null);
  const [scannedItemIndex, setScannedItemIndex] = useState(0);
  const user = useAuthStore((state) => state.user);
  const [selectedOrderRow, setSelectedOrderRow] = useState<OrderRow | null>(
    null
  );
  const [inputCode, setInputCode] = useState("");
  const [transactionQuantity, setTransactionQuantity] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [showQrReader, setShowQrReader] = useState(false);
  const [qrResult, setQrResult] = useState<string>("");
  const [qrJsonFields, setQrJsonFields] = useState<Record<string, any> | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const isSmall = useBreakpoint();
  const colSpan = isSmall ? 12 : 6;

  // Funzione per aggiungere log al debug panel
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`].slice(-20)); // Mantieni ultimi 20 log
    console.log(message); // Stampa anche in console
  };


  async function addTransaction(
    headerId: number,
    bodyId: number,
    quantity: number
  ) {
    const result = await Swal.fire({
      title: "Sei sicuro?",
      text: `Stai confermando di aver caricato ${quantity} pezzi. L'operazione è irreversibile.`,
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
        type: "ADD_TRANSACTION",
        headerId,
        bodyId,
        quantity,
        userEmail: user?.email || "system",
      });
      setOrder(
        orders.map((order) => {
          if (order.LIST_HEADER_ID === headerId) {
            return {
              ...order,
              ROWS: order.ROWS.map((row) =>
                row.LIST_BODY_ID === bodyId
                  ? { ...row, WORKED_QUANTITY: row.WORKED_QUANTITY + quantity }
                  : row
              ),
            };
          } else {
            return order;
          }
        })
      );
    } catch (error) {
      console.error("Failed to close order:", error);
    }
  }

  // Funzione per "Conferma e Chiudi" - aggiunge transazione E chiude la riga
  async function handleConfirmAndClose(
    headerId: number,
    bodyId: number,
    quantity: number
  ) {
    let transactionSucceeded = false;
    let rowClosedSucceeded = false;

    try {
      // Step 1: Aggiunge la transazione
      try {
        await apiClient.addTransactionLog({
          type: "ADD_TRANSACTION",
          headerId,
          bodyId,
          quantity,
          userEmail: user?.email || "system",
        });
        transactionSucceeded = true;
        addDebugLog(`✅ Step 1: Transazione aggiunta`);
      } catch (error) {
        addDebugLog(`❌ Step 1 FAILED: ${error}`);
        throw new Error("Impossibile registrare la transazione");
      }

      // Step 2: Chiude la riga (solo se Step 1 è andato bene)
      if (transactionSucceeded) {
        try {
          await apiClient.addTransactionLog({
            type: "CLOSE_BODY",
            headerId,
            bodyId,
            userEmail: user?.email || "system",
          });
          rowClosedSucceeded = true;
          addDebugLog(`✅ Step 2: Riga chiusa`);
        } catch (error) {
          // Se Step 2 fallisce, comunichiamo l'errore ma continuiamo
          addDebugLog(`⚠️ Step 2 FAILED: ${error}`);
          // Non rethrow - continua con l'alert
        }
      }

      // Step 3: Aggiorna lo state degli ordini in base a ciò che è riuscito
      setOrder(
        orders.map((order) => {
          if (order.LIST_HEADER_ID === headerId) {
            return {
              ...order,
              ROWS: order.ROWS.map((row) => {
                if (row.LIST_BODY_ID === bodyId) {
                  const updatedRow = { ...row, WORKED_QUANTITY: row.WORKED_QUANTITY + quantity };
                  // Se entrambi gli step sono riusciti, marca come COMPLETED
                  if (transactionSucceeded && rowClosedSucceeded) {
                    updatedRow.STATUS = "COMPLETED";
                  }
                  return updatedRow;
                }
                return row;
              }),
            };
          } else {
            return order;
          }
        })
      );

      // Step 4: Mostra l'alert appropriato
      if (transactionSucceeded && rowClosedSucceeded) {
        // Entrambi riusciti
        await Swal.fire({
          title: t('transaction.success'),
          text: `${quantity} pezzi caricati e riga chiusa!`,
          icon: "success",
          confirmButtonColor: "#3085d6",
          confirmButtonText: t('common.close'),
        });
        addDebugLog(`✅ Operazione completata con successo`);
      } else if (transactionSucceeded && !rowClosedSucceeded) {
        // Solo transazione riuscita
        await Swal.fire({
          title: "Avvertenza",
          text: `${quantity} pezzi caricati con successo, ma non è stato possibile chiudere la riga.`,
          icon: "warning",
          confirmButtonColor: "#ff9800",
          confirmButtonText: t('common.close'),
        });
        addDebugLog(`⚠️ Transazione OK, ma riga non chiusa`);
      }

      // Step 5: Reset degli state della modale
      setSelectedOrderRow(null);
      setInputCode("");
      setTransactionQuantity("");
      setShowCamera(false);

    } catch (error) {
      console.error("Failed to confirm and close:", error);
      Swal.fire({
        title: "Errore",
        text: String(error),
        icon: "error",
        confirmButtonColor: "#d33",
      });
      addDebugLog(`❌ Errore: ${error}`);
    }
  }

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

  async function closeOrderRow(headerId: number, bodyId: number) {
    const result = await Swal.fire({
      title: "Sei sicuro?",
      text: `Stai chiudendo la riga ${bodyId} dell'ordine ${headerId}. L'operazione è irreversibile.`,
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
        type: "CLOSE_BODY",
        headerId,
        bodyId,
        userEmail: user?.email || "system",
      });
      setOrder(
        orders.map((order) => {
          if (order.LIST_HEADER_ID === headerId) {
            return {
              ...order,
              ROWS: order.ROWS.map((row) =>
                row.LIST_BODY_ID === bodyId
                  ? { ...row, STATUS: "COMPLETED" }
                  : row
              ),
            };
          } else {
            return order;
          }
        })
      );
    } catch (error) {
      console.error("Failed to close order:", error);
    }
  }

  const statusIcons = {
    "NOT STARTED": Clock,
    "IN PROGRESS": Package,
    COMPLETED: CheckCircle,
  };

  const filteredOrders = orders.filter((order) => {
    const lowerSearch = searchTerm.toLowerCase();

    let   matchesSearch = true
    if(lowerSearch.startsWith("item:")) {
      const cleanedLowerSearch = lowerSearch.replace("item:", "").trim();
      matchesSearch = order.ROWS.some((row) =>
        String(row.ITEM_CODE).toLowerCase().includes(cleanedLowerSearch)
      );
    }else if(lowerSearch.startsWith("location:")) {
      const cleanedLowerSearch = lowerSearch.replace("location:", "").trim();
      matchesSearch = order.ROWS.some((row) =>
        String(row.LOCATION_CODE_FROM).toLowerCase().includes(cleanedLowerSearch)
      );
    } else {
      // Cerca in tutti gli attributi dell'oggetto order
      matchesSearch = Object.values(order).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(lowerSearch)
      ) ||
      // Cerca in tutte le righe di order.ROWS
      (order.ROWS || []).some((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(lowerSearch)
        )
      );
    }
    // Mostra solo ordini non completati di default
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "COMPLETED"
        ? order.STATUS === "COMPLETED"
        : statusFilter === "NOT COMPLETED"
        ? order.STATUS !== "COMPLETED"
        : false;
    /*const matchesUser =
      user?.role === "admin" ? true : order.ASSIGNED_USER_ID === user?.id;
    return matchesSearch && matchesStatus && matchesUser;*/
    return matchesSearch && matchesStatus ;
  });

  function groupByWarehouseAndLocation(orders: Order[]) {
    const grouped: Record<string, OrderRow[]> = {};
    const lowerSearch = searchTerm.toLowerCase().replace("item:", "").replace("from:", "").trim() || "";

    orders
      .filter((order) => order.STATUS !== "COMPLETED") // Filtra gli ordini completati
      .forEach((order) => {
        order.ROWS.filter((row) => (row.STATUS !== "COMPLETED" && 
          Object.values(row).some((value) =>
          String(value).toLowerCase().includes(lowerSearch)
        )
        )) // Filtra le righe completate
       .forEach((row) => {
            const key = `${row.WAREHOUSE_NAME} | ${row.LOCATION_CODE_FROM}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
          });
      });

    // Ordina le chiavi prima per warehouse, poi per location
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [warehouseA, locationA] = a.split(" | ");
      const [warehouseB, locationB] = b.split(" | ");
      if (warehouseA < warehouseB) return -1;
      if (warehouseA > warehouseB) return 1;
      if (locationA < locationB) return -1;
      if (locationA > locationB) return 1;
      return 0;
    });

    // Ricostruisci l'oggetto ordinato
    const sortedGrouped: Record<string, OrderRow[]> = {};
    sortedKeys.forEach((key) => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  }

  // Trova, su tutti gli ordini non completati, le righe (non completate) che matchano l'item code scansionato
  function findRowKeysForItemCode(itemCode: string): { headerId: number; bodyId: number }[] {
    const lowerCode = itemCode.toLowerCase();
    const keys: { headerId: number; bodyId: number }[] = [];
    orders
      .filter((order) => order.STATUS !== "COMPLETED")
      .forEach((order) => {
        (order.ROWS || [])
          .filter(
            (row) =>
              row.STATUS !== "COMPLETED" &&
              String(row.ITEM_CODE).toLowerCase().includes(lowerCode)
          )
          .forEach((row) =>
            keys.push({ headerId: row.LIST_HEADER_ID, bodyId: row.LIST_BODY_ID })
          );
      });
    return keys;
  }

  // Deriva le righe "live" da orders ad ogni render, cosi' restano aggiornate dopo chiusure/caricamenti
  // e le righe completate escono automaticamente dalla navigazione
  const scannedRows: OrderRow[] | null = scannedItemKeys
    ? scannedItemKeys
        .map(({ headerId, bodyId }) => {
          const order = orders.find((o) => o.LIST_HEADER_ID === headerId);
          return order?.ROWS?.find((r) => r.LIST_BODY_ID === bodyId) || null;
        })
        .filter((row): row is OrderRow => row !== null && row.STATUS !== "COMPLETED")
    : null;

  // Se la lista si accorcia (es. una riga completata esce) tiene l'indice dentro i limiti
  useEffect(() => {
    if (scannedRows && scannedItemIndex >= scannedRows.length && scannedRows.length > 0) {
      setScannedItemIndex(scannedRows.length - 1);
    }
  }, [scannedRows?.length]);

  // Se la ricerca corrisponde esattamente a un numero ordine, recap delle righe per picking zone
  const exactSearchOrderMatch = (() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return null;
    return orders.find((o) => String(o.LIST_HEADER_ID) === trimmed) || null;
  })();

  const pickingZoneRecap: { zone: string; done: number; total: number }[] | null =
    exactSearchOrderMatch
      ? (() => {
          const zones: Record<string, { done: number; total: number }> = {};
          (exactSearchOrderMatch.ROWS || []).forEach((row) => {
            const zone = row.LOCATION_CODE_FROM_GROUP || "-";
            if (!zones[zone]) zones[zone] = { done: 0, total: 0 };
            zones[zone].total += 1;
            if (row.STATUS === "COMPLETED") zones[zone].done += 1;
          });
          return Object.entries(zones)
            .map(([zone, counts]) => ({ zone, ...counts }))
            .sort((a, b) => a.zone.localeCompare(b.zone));
        })()
      : null;

  // Funzione per gestire la scansione QR (mock, da integrare con una libreria reale)
  function handleScanQRCode() {
    // Qui puoi integrare una libreria come html5-qrcode o simili
    // Per ora simula la lettura
    setInputCode("QR-CODE-EXAMPLE");
    setShowCamera(false);
  }

  // Ref to hold the Html5Qrcode instance for cleanup
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Funzione per avviare la scansione QR
  function startQrScan() {
    const qrRegionId = "qr-reader";
    // First ensure we can access the camera from the browser context (getUserMedia)
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }

        // Request permission first; if denied an exception will be thrown
        await navigator.mediaDevices.getUserMedia({ video: true });

        // Create and store instance in ref so we can stop it elsewhere
        html5QrRef.current = new Html5Qrcode(qrRegionId);
        html5QrRef.current
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
              setQrResult(decodedText);
              setShowQrReader(false);
              // Stop scanner safely
              if (html5QrRef.current && isScannerRunningRef.current) {
                html5QrRef.current
                  .stop()
                  .catch((e) => console.warn('Error stopping html5QrCode', e));
                isScannerRunningRef.current = false;
              }

              // Parse result
              try {
                const parsed = JSON.parse(decodedText);
                setQrJsonFields(parsed);
              } catch {
                const obj: Record<string, string> = {};
                decodedText.split('&').forEach((pair) => {
                  const [key, value] = pair.split('=');
                  if (key) obj[key] = value || '';
                });
                setQrJsonFields(obj);
              }
            },
            (errorMessage) => {
              // ignore per-frame errors
            }
          )
          .then(() => {
            isScannerRunningRef.current = true;
          })
          .catch((err) => {
            console.error('Error starting scanner:', err);
            // fallback behavior
            const fallbackText =
              'WAREHOUSE=example_no_camera_found&LOCATION=GRIM&ITEM=RC90062063&WEIGHT=17.50&BOX_TYPE=CONT_001&PIECES_PER_BOX=500&DESCRIPTION=5.38B / 5 Semil Ruota Semil';
            setQrResult(fallbackText);
            setShowQrReader(false);
            const obj: Record<string, string> = {};
            fallbackText.split('&').forEach((pair) => {
              const [key, value] = pair.split('=');
              if (key) obj[key] = value || '';
            });
            setQrJsonFields(obj);
          });
      } catch (err: any) {
        // Permission denied or no camera — show fallback
        console.error('Error getting userMedia, error =', err);
        const fallbackText =
          'WAREHOUSE=example_no_camera_found&LOCATION=GRIM&ITEM=RC90062063&WEIGHT=17.50&BOX_TYPE=CONT_001&PIECES_PER_BOX=500&DESCRIPTION=5.38B / 5 Semil Ruota Semil';
        setQrResult(fallbackText);
        setShowQrReader(false);
        const obj: Record<string, string> = {};
        fallbackText.split('&').forEach((pair) => {
          const [key, value] = pair.split('=');
          if (key) obj[key] = value || '';
        });
        setQrJsonFields(obj);
      }
    })();
  }

  // Auto-start scanner when modal opens and cleanup when closes
  useEffect(() => {
    if (showQrReader) {
      startQrScan();
    }
    return () => {
      // stop scanner if active
      if (html5QrRef.current && isScannerRunningRef.current) {
        html5QrRef.current
          .stop()
          .catch((e) => console.warn('Error stopping Html5Qrcode on cleanup', e));
        html5QrRef.current = null;
        isScannerRunningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQrReader]);

  // Gestisci QR Scanner - LISTENER GLOBALE INVISIBILE
  useEffect(() => {
    let qrBuffer = '';
    let qrTimeout: NodeJS.Timeout | null = null;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      
      // IMPORTANTISSIMO: Se l'utente sta in un campo di testo, IGNORA TUTTO
      const isInTextInput = 
        (activeElement?.tagName === 'INPUT') || 
        (activeElement?.tagName === 'TEXTAREA') ||
        (activeElement?.tagName === 'SELECT') ||
        (activeElement?.getAttribute('contenteditable') === 'true');
      
      if (isInTextInput) {
        // NON fare NIENTE - lascia che l'evento vada direttamente all'input
        return;
      }
      
      // Se Enter o Tab, finalizza lo scan (solo se NON siamo in un input)
      if (e.key === 'Enter' || e.key === 'Tab' || (e as any).keyCode === 13 || (e as any).keyCode === 9) {
        if (qrBuffer.length > 0) {
          e.preventDefault();
          addDebugLog(`🛑 TERMINATOR: ${e.key || 'Enter/Tab'}`);
          addDebugLog(`📦 QR COMPLETO: ${qrBuffer}`);
          
          // Prova a parsare
          try {
            const parsed = JSON.parse(qrBuffer);
            setQrJsonFields(parsed);
            setQrResult(qrBuffer);
            addDebugLog(`✅ JSON OK`);
          } catch {
            const obj: Record<string, string> = {};
            qrBuffer.split('&').forEach((pair) => {
              const [key, val] = pair.split('=');
              if (key) obj[key] = val || '';
            });
            setQrJsonFields(obj);
            setQrResult(qrBuffer);
            addDebugLog(`✅ Query String OK`);
          }
          
          qrBuffer = '';
        }
        return;
      }
      
      // Se è un carattere stampabile, aggiungilo al buffer
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        qrBuffer += e.key;
        //addDebugLog(`📝 Buffer: "${qrBuffer}"`);
        
        // Reset timeout: se passano 150ms senza input, cancella
        if (qrTimeout) clearTimeout(qrTimeout);
        qrTimeout = setTimeout(() => {
          qrBuffer = '';
        }, 150);
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      
      // Se siamo in un vero input, lascia che il paste vada direttamente
      const isInTextInput = 
        (activeElement?.tagName === 'INPUT') || 
        (activeElement?.tagName === 'TEXTAREA') ||
        (activeElement?.tagName === 'SELECT') ||
        (activeElement?.getAttribute('contenteditable') === 'true');
      
      if (isInTextInput) {
        return; // Lascia fare il paste normale
      }
      
      // Altrimenti, il paste potrebbe essere dal Zebra
      const pastedText = e.clipboardData?.getData('text') || '';
      addDebugLog(`📋 PASTE EVENT: "${pastedText}"`);
      
      if (pastedText && pastedText.length > 0) {
        e.preventDefault();
        
        // Prova a parsare il QR da paste
        try {
          const parsed = JSON.parse(pastedText);
          setQrJsonFields(parsed);
          setQrResult(pastedText);
          addDebugLog(`✅ JSON OK (da paste)`);
        } catch {
          const obj: Record<string, string> = {};
          pastedText.split('&').forEach((pair) => {
            const [key, val] = pair.split('=');
            if (key) obj[key] = val || '';
          });
          setQrJsonFields(obj);
          setQrResult(pastedText);
          addDebugLog(`✅ Query String OK (da paste)`);
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('paste', handleGlobalPaste);
    addDebugLog('🟢 GLOBAL QR LISTENER ACTIVE (keydown + paste)');
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('paste', handleGlobalPaste);
      if (qrTimeout) clearTimeout(qrTimeout);
    };
  }, []);

  // OLD QR HANDLING - RIMOSSO

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Input QR INVISIBILE - Zebra scrive qui automaticamente, nessun focus richiesto */}
      <input
        ref={qrInputRef}
        id="qr"
        type="text"
        autoFocus
        style={{ display: 'none' }}
        className="qr-input"
      />
      
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Row 1: Title, QR Button, Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Orders
              </h3>
              {debugEnabled && debugLog.length > 0 && (
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold cursor-pointer hover:bg-red-200"
                  title="Clicca per aprire/chiudere il debug panel"
                >
                  🔴 DEBUG: {debugLog.length}
                </button>
              )}
            </div>
            <div className="flex flex-row gap-2 w-full sm:w-auto items-center">
              {/* Pulsante QR Code */}
              <button
                type="button"
                className="flex items-center gap-2 btn px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-blue-600"
                onClick={() => setShowQrReader(true)}
                title="Apri lettore QR"
              >
                <QrCode className="w-6 h-6" />
                <span className="hidden sm:inline">QRCode</span>
              </button>
              {/* Toggle visualizzazione */}
              <div className="flex items-center gap-2 justify-center">
                <span
                  className={
                    viewMode === "order"
                      ? "font-semibold text-blue-700 text-sm"
                      : "text-gray-500 text-sm"
                  }
                >
                  {t('orders.perOrder')}
                </span>
                <button
                  type="button"
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    viewMode === "warehouse" ? "bg-blue-600" : "bg-gray-300"
                  }`}
                  onClick={() =>
                    setViewMode(viewMode === "order" ? "warehouse" : "order")
                  }
                  aria-pressed={viewMode === "warehouse"}
                  aria-label="Toggle visualizzazione"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      viewMode === "warehouse" ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
                <span
                  className={
                    viewMode === "warehouse"
                      ? "font-semibold text-blue-700 text-sm"
                      : "text-gray-500 text-sm"
                  }
                >
                  {t('orders.perWarehouse')}
                </span>
              </div>
            </div>
          </div>
          {/* Row 2: Status filter and Search */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as Order["STATUS"] | "all")
              }
              className="w-full sm:w-auto rounded-lg border border-gray-300 py-3 px-4 touch-input focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            >
              <option value="all">{t('orders.allStatus')}</option>
              <option value="NOT COMPLETED">{t('orders.notCompleted')}</option>
              <option value="COMPLETED">{t('orders.completed')}</option>
            </select>
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('orders.searchOrders')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-3 rounded-lg border border-gray-300 touch-input focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
          </div>
          {/* Recap righe per picking zone: solo quando la ricerca corrisponde esattamente a un numero ordine */}
          {pickingZoneRecap && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-sm font-semibold text-gray-600">{t('orders.LOCATION_CODE_FROM_GROUP')}</th>
                    <th className="px-4 py-2 text-sm font-semibold text-gray-600">{t('orders.rows')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pickingZoneRecap.map(({ zone, done, total }) => (
                    <tr key={zone} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-2 text-base font-medium">{zone}</td>
                      <td className="px-4 py-2 text-base">{done}/{total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Modal QR Reader con html5-qrcode */}
        {showQrReader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl btn p-2"
                onClick={() => {
                  setShowQrReader(false);
                  setQrJsonFields(null);
                  setQrResult("");
                }}
              >
                ×
              </button>
              <h2 className="text-lg font-semibold mb-4">{t('common.qr_reader')}</h2>
              <div id="qr-reader" className="w-full h-64" />
              <button
                className="bg-blue-600 text-white px-4 py-3 rounded mt-4 btn"
                onClick={startQrScan}
              >
                {t('orders.qrScan')}
              </button>
              {qrResult && !qrJsonFields && (
                <div className="mt-2 text-red-600 font-bold">
                  {t('orders.invalidJson')}<br />
                  {qrResult}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {/* MODAL PER INSERIMENTO CODICE E NUMERO */}
        {selectedOrderRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 min-w-[360px] max-w-2xl relative max-h-[90vh] overflow-auto">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-4xl btn p-2"
                onClick={() => {
                  setSelectedOrderRow(null);
                  setInputCode("");
                  setTransactionQuantity("");
                  setShowCamera(false);
                }}
              >
                ×
              </button>
              <h2 className="text-3xl font-bold mb-6">
                {t('orders.loadObject')}
              </h2>

              {/* Info Ordine */}
              {selectedOrderRow && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">{t('orders.orderId')}</p>
                      <p className="text-xl font-bold text-blue-900">{selectedOrderRow.LIST_HEADER_ID}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">{t('orders.itemCode')}</p>
                      <p className="text-xl font-bold text-blue-900">{selectedOrderRow.ITEM_CODE}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">{t('orders.locationFrom')}</p>
                      <p className="text-xl font-bold text-blue-900">{selectedOrderRow.LOCATION_CODE_FROM}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xl font-semibold mb-3">
                    {t('orders.code')}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      className="border-2 rounded px-6 py-4 w-full touch-input text-lg"
                      placeholder={t('orders.insertCode')}
                    />
                    {/* Mostra il pulsante QR solo su mobile */}
                    {typeof window !== "undefined" &&
                      /Android|iPhone|iPad/i.test(navigator.userAgent) && (
                        <button
                          type="button"
                          className="p-4 bg-gray-100 rounded hover:bg-gray-200 btn flex-shrink-0"
                          onClick={() => setShowCamera(true)}
                          title="Scansiona QR"
                        >
                          <QrCode className="w-8 h-8" />
                        </button>
                      )}
                  </div>
                </div>
                <div>
                  <label className="block text-xl font-semibold mb-3">
                    {t('common.quantity')}
                  </label>
                  <input
                    type="number"
                    value={transactionQuantity}
                    onChange={(e) =>
                      setTransactionQuantity(e.target.value.replace(/\D/, ""))
                    }
                    className="border-2 rounded px-6 py-4 w-full touch-input text-lg"
                    placeholder={t('orders.insertNumber')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                {/* Calcola la quantità mancante */}
                {selectedOrderRow && (
                  <div className="text-sm text-gray-600 p-3 bg-gray-100 rounded">
                    {t('orders.quantityMissing')}: {selectedOrderRow.QUANTITY - selectedOrderRow.WORKED_QUANTITY}
                  </div>
                )}
                {/* Bottoni di azione */}
                <div className="flex gap-4 mt-4">
                  <button
                    className="flex-1 bg-blue-600 text-white rounded py-4 hover:bg-blue-700 btn text-xl font-bold"
                    onClick={() => {
                      addTransaction(
                        selectedOrderRow.LIST_HEADER_ID,
                        selectedOrderRow.LIST_BODY_ID,
                        parseInt(transactionQuantity)
                      );
                      setSelectedOrderRow(null);
                      setInputCode("");
                      setTransactionQuantity("");
                      setShowCamera(false);
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                  
                  {/* Mostra il bottone "Conferma e Chiudi" se la quantità è >= a quella mancante */}
                  {selectedOrderRow && 
                    parseInt(transactionQuantity) >= (selectedOrderRow.QUANTITY - selectedOrderRow.WORKED_QUANTITY) &&
                    parseInt(transactionQuantity) > 0 && (
                    <button
                      className="flex-1 bg-green-600 text-white rounded py-4 hover:bg-green-700 btn text-xl font-bold"
                      onClick={() => handleConfirmAndClose(
                        selectedOrderRow.LIST_HEADER_ID,
                        selectedOrderRow.LIST_BODY_ID,
                        parseInt(transactionQuantity)
                      )}
                    >
                      ✓ Conferma e Chiudi
                    </button>
                  )}
                </div>
                {/* Mock camera/QR */}
                {showCamera && (
                  <div className="mt-6 p-6 border-2 rounded bg-gray-50 flex flex-col items-center">
                    <p className="mb-3 text-lg font-medium">
                      [{t('orders.simulation')}] {t('orders.scanQrCode')}
                    </p>
                    <button
                      className="bg-green-600 text-white px-6 py-3 rounded btn text-lg font-semibold"
                      onClick={handleScanQRCode}
                    >
                      {t('orders.simulateScan')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NAVIGAZIONE A SINGOLO ARTICOLO (dopo scansione QR di un ITEM) */}
        {scannedRows !== null ? (
          <div className="p-4">
            {scannedRows.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-xl mb-6">{t('orders.noMatchesForItem', 'Nessun ordine trovato per questo articolo')}</p>
                <button
                  className="btn px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold"
                  onClick={() => setScannedItemKeys(null)}
                >
                  {t('common.close')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 max-w-2xl mx-auto">
                  <button
                    className="btn p-2 text-gray-400 hover:text-gray-600 text-3xl"
                    onClick={() => setScannedItemKeys(null)}
                    title={t('common.close')}
                  >
                    ×
                  </button>
                  <span className="text-xl font-semibold text-gray-700">
                    {scannedItemIndex + 1} / {scannedRows.length}
                  </span>
                  <span className="w-10" />
                </div>

                {(() => {
                  const row = scannedRows[scannedItemIndex];
                  const order = orders.find((o) => o.LIST_HEADER_ID === row.LIST_HEADER_ID);
                  return (
                    <div
                      className="bg-white rounded shadow p-6 flex flex-col gap-5 border-l-4 max-w-2xl mx-auto"
                      style={{
                        borderLeftColor:
                          row.STATUS === "IN PROGRESS" ? "#3b82f6" : "#facc15",
                      }}
                    >
                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                        <div>
                          <span className="font-semibold text-2xl text-gray-600">{t('orders.orderId')}:</span>
                          <p className="text-2xl font-medium">{row.LIST_HEADER_ID}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-2xl text-gray-600">{t('orders.itemCode')}:</span>
                          <p className="text-2xl font-medium">{row.ITEM_CODE}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-2xl text-gray-600">{t('orders.locationFrom')}:</span>
                          <p className="text-2xl">{row.LOCATION_CODE_FROM}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-2xl text-gray-600">{t('common.quantity')}:</span>
                          <p className="text-2xl">{row.WORKED_QUANTITY} / {row.QUANTITY}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-2xl text-gray-600">{t('orders.description')}:</span>
                        <p className="text-2xl">{row.ITEM_DESCRIPTION}</p>
                      </div>
                      {order && order.STATUS !== "COMPLETED" && row.STATUS !== "COMPLETED" && (
                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            className="btn px-6 py-4 text-2xl text-blue-600 rounded-md border-2 border-blue-600 hover:bg-blue-50 font-semibold"
                            onClick={() => closeOrderRow(row.LIST_HEADER_ID, row.LIST_BODY_ID)}
                          >
                            {t('orders.closeRow')}
                          </button>
                          <button
                            className="btn px-6 py-4 text-2xl text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-3 font-semibold"
                            onClick={() => setSelectedOrderRow(row)}
                            title={t('orders.loadItem')}
                          >
                            <BaggageClaim className="w-8 h-8" />
                            <span>{t('common.load')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between mt-6 max-w-2xl mx-auto gap-4">
                  <button
                    className="btn flex-1 px-6 py-4 rounded-lg bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xl font-semibold flex items-center justify-center gap-2"
                    disabled={scannedItemIndex === 0}
                    onClick={() => setScannedItemIndex((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft className="w-6 h-6" /> {t('common.previous', 'Indietro')}
                  </button>
                  <button
                    className="btn flex-1 px-6 py-4 rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed text-xl font-semibold flex items-center justify-center gap-2"
                    disabled={scannedItemIndex >= scannedRows.length - 1}
                    onClick={() => setScannedItemIndex((i) => Math.min(scannedRows.length - 1, i + 1))}
                  >
                    {t('common.next', 'Avanti')} <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
        <>
        {/* VISUALIZZAZIONE PER ORDINE */}
        {viewMode === "order" ? (
          <>
            {/* LEGENDA DEGLI STATI - Solo su mobile */}
            {isSmall && (
              <div className="bg-gray-50 px-4 py-4 border-b border-gray-200 flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">NOT STARTED</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#E1EFFE", color: "#1E429F" }}>
                    <Package className="w-5 h-5" />
                    <span className="text-sm font-medium">IN PROGRESS</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#DEF7EC", color: "#03543F" }}>
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">COMPLETED</span>
                  </div>
                </div>
              </div>
            )}

            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-6 px-2 py-3"></th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider"
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <React.Fragment key={order.LIST_HEADER_ID}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <button
                        onClick={() =>
                          handleExpandOrder(
                            expandedOrder === order.LIST_HEADER_ID
                              ? null
                              : order.LIST_HEADER_ID
                          )
                        }
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 btn"
                      >
                        {expandedOrder === order.LIST_HEADER_ID ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-base font-medium text-gray-900">
                        {order.LIST_HEADER_ID}
                      </div>
                      <div className="text-base text-gray-500">
                        {order.LIST_TYPE_DESCRIPTION}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-base font-medium capitalize"
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
                            className: "mr-1 h-5 w-5",
                          }
                        )}
                        {!isSmall && order.STATUS}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-base text-gray-500">
                      {order.ROWS_IN_5}/{order.ROWS_COUNT}
                    </td>
                    <td className="px-4 py-4 text-base text-gray-500">
                      {new Date(order.LIST_DATE).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedOrder === order.LIST_HEADER_ID && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900">
                            Items
                          </h4>
                          <div className="grid gap-4">
                            {order.ROWS ? order.ROWS.map((orderRow) => (
                              <div
                                key={orderRow.LIST_BODY_ID}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-md shadow-sm"
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
                                {/* Blocco principale: ordine di lettura richiesto per l'operatore Magazzino
                                    (Order Type, Order Number, Item Code, Description, Quantity, From, To) */}
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <UserIcon className="h-4 w-4" />
                                    {orderRow.ASSIGNED_TO || "Unassigned"}
                                  </div>
                                  <p className="text-sm font-medium">
                                    Order Type: <span className="font-semibold">{orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE || "-"}</span>
                                  </p>
                                  <p className="text-sm font-medium">
                                    Order Number: <span className="font-semibold">{orderRow.PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_NUMBER || "-"}</span>
                                  </p>
                                  <p className="text-sm font-medium">
                                    Item Code: <span className="font-semibold">{orderRow.ITEM_CODE}</span>
                                  </p>
                                  <p className="text-sm font-medium">
                                    Description: <span className="font-semibold">{orderRow.ITEM_DESCRIPTION}</span>
                                  </p>
                                  <p className="text-sm font-medium flex items-center gap-2">
                                    Quantity:
                                    <span
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
                                            : orderRow.STATUS === "IN PROGRESS"
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
                                      {orderRow.WORKED_QUANTITY} / {orderRow.QUANTITY}
                                    </span>
                                  </p>
                                  <p className="text-sm font-medium">
                                    From: <span className="font-semibold">{orderRow.LOCATION_CODE_FROM}</span>
                                  </p>
                                  <p className="text-sm font-medium">
                                    To: <span className="font-semibold">{orderRow.LOCATION_CODE_TO}</span>
                                  </p>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <Truck className="h-6 w-6 text-gray-400" />
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
                                        {
                                          orderRow.DELIVERY_TERMS_DESCRIPTION
                                        }
                                      </p>
                                    )}
                                    {orderRow.DELIVERY_TERMS_DESCRIPTION && (
                                      <p className="text-xs text-gray-500">
                                        Delivery Terms EN:{" "}
                                        {
                                          orderRow.DELIVERY_TERMS_DESCRIPTION
                                        }
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
                                  <Info className="h-6 w-6 text-gray-400" />
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
                                    {orderRow.TRANSFER_DOCUMENT_TYPE && (
                                      <p className="text-xs text-gray-500">
                                        Document Type:{" "}
                                        {orderRow.TRANSFER_DOCUMENT_TYPE}
                                      </p>
                                    )}
                                    {orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER != null &&
                                      String(orderRow.TRANSFER_DOCUMENT_ORDER_NUMBER) !== "0" && (
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
                                {order.STATUS !== "COMPLETED" &&
                                  orderRow.STATUS !== "COMPLETED" && (
                                    <div className="col-span-2 flex items-center justify-end gap-2 mt-2">
                                      <button
                                        className="btn px-3 py-2 text-base text-blue-600 rounded-md border border-transparent hover:bg-blue-50"
                                        onClick={() =>
                                          closeOrderRow(
                                            orderRow.LIST_HEADER_ID,
                                            orderRow.LIST_BODY_ID
                                          )
                                        }
                                      >
                                        CHIUDI RIGA
                                      </button>
                                      <button
                                        className="btn px-3 py-2 text-base text-blue-600 rounded-md flex items-center gap-2"
                                        onClick={() =>
                                          setSelectedOrderRow(orderRow)
                                        }
                                        title="Carica Oggetto"
                                      >
                                        <BaggageClaim className="w-6 h-6" />
                                        <span className="hidden sm:inline">Carica</span>
                                      </button>
                                      {/* Se vuoi mostrare un'icona di stato, ad esempio: */}
                                      {/* {orderRow.isLoaded && (
                                    <CheckCircle className="w-5 h-5 text-green-500" title="Oggetto caricato" />
                                  )} */}
                                    </div>
                                  )}
                              </div>
                            )): (
                              <div className="text-center text-gray-500 py-4">
                                Nessun dettaglio disponibile
                              </div>
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
          </>
        ) : (
          // VISUALIZZAZIONE PER WAREHOUSE/LOCATION
          <div className="overflow-x-auto">
            {viewMode === "warehouse" ? (
              <div>
                <h4 className="text-2xl font-medium leading-6 text-gray-900 text-center italic my-4 max-w-2xl mx-auto break-words">
                  {t('orders.onlyUnworked')}
                </h4>
                {/* Card layout per tutti i device */}
                <div className="flex flex-col gap-6 p-4">
                  {Object.entries(
                    groupByWarehouseAndLocation(filteredOrders)
                  ).map(([key, rows]) =>
                    rows.map((row) => (
                      <div
                        key={row.LIST_BODY_ID}
                        className="bg-white rounded shadow p-6 flex flex-col gap-5 border-l-4 border-blue-500"
                      >
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                          <div>
                            <span className="font-semibold text-2xl text-gray-600">{t('orders.orderId')}:</span>
                            <p className="text-2xl font-medium">{row.LIST_HEADER_ID}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-2xl text-gray-600">{t('orders.itemCode')}:</span>
                            <p className="text-2xl font-medium">{row.ITEM_CODE}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-2xl text-gray-600">{t('orders.warehouseName')}:</span>
                            <p className="text-2xl font-medium">{row.WAREHOUSE_NAME}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-2xl text-gray-600">{t('orders.locationFrom')}:</span>
                            <p className="text-2xl">{row.LOCATION_CODE_FROM}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-2xl text-gray-600">{t('common.quantity')}:</span>
                            <p className="text-2xl">{row.WORKED_QUANTITY} / {row.QUANTITY}</p>
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-2xl text-gray-600">{t('orders.description')}:</span>
                          <p className="text-2xl">{row.ITEM_DESCRIPTION}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            className="btn px-6 py-4 text-2xl text-blue-600 rounded-md border-2 border-blue-600 hover:bg-blue-50 font-semibold"
                            onClick={() =>
                              closeOrderRow(
                                row.LIST_HEADER_ID,
                                row.LIST_BODY_ID
                              )
                            }
                          >
                            {t('orders.closeRow')}
                          </button>
                          <button
                            className="btn px-6 py-4 text-2xl text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-3 font-semibold"
                            onClick={() => setSelectedOrderRow(row)}
                            title={t('orders.loadItem')}
                          >
                            <BaggageClaim className="w-8 h-8" />
                            <span>{t('common.load')}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // ...visualizzazione per ordine...
              <div className="min-w-full divide-y divide-gray-200">
                <div className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block" />
                    <span>NOT STARTED</span>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 block" />
                    <span>PROCESSING</span>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 block" />
                    <span>COMPLETED</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* DEBUG PANEL - Mostra i log in tempo reale SOLO se abilitato nel DB */}
      {debugEnabled && showDebugPanel && debugLog.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-gray-900 text-green-400 rounded-lg shadow-2xl p-4 text-xs font-mono z-40 max-h-96 overflow-y-auto border-2 border-green-400">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-400">
            <div className="font-bold text-green-300">🔍 DEBUG LOG ({debugLog.length})</div>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="text-green-400 hover:text-green-300 font-bold text-lg cursor-pointer"
              title="Chiudi debug panel"
            >
              ×
            </button>
          </div>
          <div className="space-y-1">
            {debugLog.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal per mostrare i campi JSON scansionati */}
      {qrJsonFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[360px] max-w-2xl relative max-h-[90vh] overflow-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-4xl btn p-2"
              onClick={() => {
                setQrJsonFields(null);
                setQrResult("");
              }}
            >
              ×
            </button>
            <h2 className="text-3xl font-bold mb-6">{t('orders.qrData')}</h2>
            <form className="space-y-5 mb-6">
              {Object.entries(qrJsonFields).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-lg font-semibold mb-2">{key}</label>
                  <input
                    type="text"
                    value={String(value)}
                    readOnly
                    className="border-2 rounded px-6 py-4 w-full bg-gray-100 text-base"
                  />
                </div>
              ))}
            </form>
            <div className="flex justify-end gap-4">
              <button
                className="bg-gray-300 text-gray-700 px-8 py-4 rounded hover:bg-gray-400 btn text-lg font-semibold"
                onClick={() => {
                  setQrJsonFields(null);
                  setQrResult("");
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                className="bg-blue-600 text-white px-8 py-4 rounded hover:bg-blue-700 btn text-lg font-semibold"
                onClick={() => {
                  const itemCode = qrJsonFields["ITEM"] || qrJsonFields["ITEM_CODE"];
                  if (itemCode) {
                    // Naviga tra tutte le righe che hanno questo item, una alla volta
                    setScannedItemKeys(findRowKeysForItemCode(String(itemCode)));
                    setScannedItemIndex(0);
                  } else {
                    setViewMode("warehouse");
                    if (qrJsonFields["LOCATION"]) {
                      setSearchTerm(`LOCATION: ${qrJsonFields["LOCATION"]}`);
                    } else {
                      setSearchTerm(``);
                    }
                  }
                  setQrJsonFields(null);
                  setQrResult("");
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
