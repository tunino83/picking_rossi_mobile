import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function InventoryScanner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [showScanner, setShowScanner] = useState(false);
  const [qrResult, setQrResult] = useState<string>('');
  const [qrJson, setQrJson] = useState<Record<string, any> | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [showScannedModal, setShowScannedModal] = useState(false);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const PAGE_SIZE = 25;

  async function startScan() {
    const qrRegionId = 'inventory-qr-reader';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      await navigator.mediaDevices.getUserMedia({ video: true });

      html5QrRef.current = new Html5Qrcode(qrRegionId);
      html5QrRef.current
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            setQrResult(decodedText);
            setShowScanner(false);
            // stop scanner
            if (html5QrRef.current && isScannerRunningRef.current) {
              html5QrRef.current
                .stop()
                .catch((e) => console.warn('Error stopping html5QrCode', e));
              isScannerRunningRef.current = false;
            }

            // try parse JSON
            try {
              const parsed = JSON.parse(decodedText);
              setQrJson(parsed);
              setShowScannedModal(true);
            } catch {
              // fallback parse key=value pairs
              const obj: Record<string, string> = {};
              decodedText.split('&').forEach((pair) => {
                const [key, value] = pair.split('=');
                if (key) obj[key] = value || '';
              });
              setQrJson(obj);
              setShowScannedModal(true);
            }
          },
          (_errorMessage) => {
            // ignore per-frame errors
          }
        )
        .then(() => {
          isScannerRunningRef.current = true;
        })
        .catch((err) => {
          console.error('Error starting scanner:', err);
            const fallbackText = 'NO_CAMERA_AVAILABLE';
            setQrResult(fallbackText);
            setShowScanner(false);
            setQrJson({ raw: fallbackText });
            setShowScannedModal(true);
        });
    } catch (err: any) {
      console.error('Error getting userMedia:', err);
      const fallbackText = 'NO_CAMERA_AVAILABLE';
      setQrResult(fallbackText);
      setShowScanner(false);
      setQrJson({ raw: fallbackText });
    }
  }

  useEffect(() => {
    if (showScanner) startScan();
    return () => {
      if (html5QrRef.current && isScannerRunningRef.current) {
        html5QrRef.current
          .stop()
          .catch((e) => console.warn('Error stopping Html5Qrcode on cleanup', e));
        html5QrRef.current = null;
        isScannerRunningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner]);

  // (no header/body extraction needed for inventory updates)

  async function confirmInventoryUpdate() {
    const parsed = qrJson;

    const q = Number(quantity || 0);
    if (!q || q <= 0) {
      await Swal.fire(t('common.error'), t('common.invalidQuantity'), 'error');
      return;
    }

    const res = await Swal.fire({
      title: t('common.confirm'),
      text: `${t('common.quantity')}: ${q}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });

    if (!res.isConfirmed) return;

    try {
      // build payload from scanned json
      const itemCode = (qrJson && (qrJson.ITEM_CODE || qrJson.itemCode || qrJson.ITEM || qrJson.Item)) as string | undefined;
      const locationCode = (qrJson && (qrJson.LOCATION_CODE || qrJson.locationCode || qrJson.LOCATION || qrJson.Location)) as string | undefined;
      const warehouseCode = (qrJson && (qrJson.WAREHOUSE_CODE || qrJson.warehouseCode || qrJson.WAREHOUSE || qrJson.Warehouse)) as string | undefined;

      if (!itemCode || !locationCode) {
        await Swal.fire('Errore', 'Il QR non contiene ITEM_CODE o LOCATION_CODE.', 'error');
        return;
      }

      await apiClient.addStockEntry({ warehouseCode, itemCode, locationCode, quantity: q });

      await Swal.fire(t('common.success'), t('common.updateSuccess'), 'success');
      // reset
      setQrJson(null);
      setQrResult('');
      setQuantity('');
      setShowScannedModal(false);
      // refresh table
      await loadStock();
    } catch (err) {
      console.error('Inventory update failed', err);
      await Swal.fire(t('common.error'), t('common.updateFailed'), 'error');
    }
  }

  // Load stock rows for the user's warehouse (or all if admin)
  async function loadStock(p: number = 1) {
    try {
      setLoadingStock(true);
      const warehouseCode = user?.WAREHOUSE_CODE;
      const resp = await apiClient.getStock(warehouseCode, p, PAGE_SIZE);
      setStockRows(resp.stock || []);
      setTotalRows(resp.total || 0);
      setPage(resp.page || p);
    } catch (err) {
      console.error('Failed to load stock:', err);
      setStockRows([]);
      setTotalRows(0);
    } finally {
      setLoadingStock(false);
    }
  }

  useEffect(() => {
    loadStock(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('common.inventory') || 'Inventario'}</h2>
        <div className="flex gap-2">
          <button
            className="btn bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => setShowScanner(true)}
          >
            {t('common.scan') || 'Scansiona QR'}
          </button>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">{t('common.page') || 'Pagina'} {page} / {Math.max(1, Math.ceil(totalRows / PAGE_SIZE))} — {totalRows} {t('common.records') || 'records'}</div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            className={`px-3 py-2 rounded ${page <= 1 ? 'bg-gray-200 text-gray-400' : 'bg-white border'}`}
            onClick={() => loadStock(Math.max(1, page - 1))}
          >
            {t('common.prev') || 'Prev'}
          </button>
          <button
            disabled={page * PAGE_SIZE >= totalRows}
            className={`px-3 py-2 rounded ${page * PAGE_SIZE >= totalRows ? 'bg-gray-200 text-gray-400' : 'bg-white border'}`}
            onClick={() => loadStock(page + 1)}
          >
            {t('common.next') || 'Next'}
          </button>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">{t('common.scan_instruction') || 'Usa il pulsante Scansiona QR per iniziare.'}</div>

      {/* Stock table */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium">{t('common.stock') || 'Stock'}</h3>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => loadStock()}>{t('common.refresh') || 'Aggiorna'}</button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ITEM_CODE</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">LOCATION_CODE</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">QUANTITY</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">STOCK_CHECK_DATE</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loadingStock ? (
                <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">{t('common.loading')}</td></tr>
              ) : stockRows.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">{t('common.noRecords')}</td></tr>
              ) : (
                stockRows.map((r, idx) => (
                  <tr key={r.STOCK_ID || idx}>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.ITEM_CODE}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.LOCATION_CODE}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">{Number(r.QUANTITY).toLocaleString(undefined, {maximumFractionDigits:3})}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.STOCK_CHECK_DATE ? new Date(r.STOCK_CHECK_DATE).toLocaleString() : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-10 min-w-[360px] sm:min-w-[520px] max-w-full sm:max-w-2xl max-h-[90vh] overflow-auto relative touch-friendly">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl btn p-2" onClick={() => setShowScanner(false)}>×</button>
            <h2 className="text-lg font-semibold mb-4">{t('common.qr_reader') || 'Lettore QR Code'}</h2>
            <div id="inventory-qr-reader" className="w-full h-64 bg-black" />
            <div className="mt-4 flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => startScan()}>{t('common.start') || 'Avvia scansione'}</button>
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => { setShowScanner(false); }}>{t('common.cancel') || 'Annulla'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Scanned object modal: shows parsed JSON and quantity input */}
      {showScannedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl btn p-2" onClick={() => { setShowScannedModal(false); setQrJson(null); setQrResult(''); }}>{'×'}</button>
            <h2 className="text-lg font-semibold mb-4">{t('common.scanned_object') || 'Oggetto letto'}</h2>
            <div className="mb-4 text-base sm:text-lg">
              {qrJson && typeof qrJson === 'object' ? (
                <div className="space-y-3 max-h-[60vh] overflow-auto">
                  {Object.entries(qrJson).map(([k, v]) => (
                    <div key={k} className="flex flex-col sm:flex-row justify-between items-start gap-3 bg-gray-50 p-4 sm:p-3 rounded">
                      <div className="text-base sm:text-sm text-gray-600 w-full sm:w-1/2 break-words font-medium">{k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                      <div className="text-lg sm:text-sm text-gray-800 w-full sm:w-1/2 text-right break-words">{v === null || v === undefined ? '' : String(v)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded text-base overflow-auto max-h-60">{qrResult}</div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-base sm:text-lg font-semibold mb-2">{t('common.quantity') || 'Quantità'}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full border rounded px-4 py-3 sm:px-6 sm:py-4 touch-input text-lg"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="bg-green-600 text-white px-6 py-3 rounded btn text-lg shadow-md" onClick={confirmInventoryUpdate}>{t('common.confirm') || 'Conferma'}</button>
              <button className="bg-gray-200 px-5 py-3 rounded text-lg" onClick={() => { setShowScannedModal(false); setQrJson(null); setQrResult(''); }}>{t('common.cancel') || 'Annulla'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryScanner;
