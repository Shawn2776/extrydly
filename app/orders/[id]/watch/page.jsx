"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

const StatusBadge = ({ status }) => {
  const styles = {
    idle: "bg-gray-100 text-gray-600",
    printing: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    finished: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full ${styles[status] ?? styles.idle}`}
    >
      {status}
    </span>
  );
};

const TempGauge = ({ label, current, target }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-[#888780] font-medium">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-[#2C2C2A]">{current}°</span>
      {target > 0 && <span className="text-sm text-[#888780]">/ {target}°</span>}
    </div>
  </div>
);

export default function WatchPage() {
  const { id: orderId } = useParams();
  const [printState, setPrintState] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  // ── Fetch stream token then connect camera ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function connectStream() {
      console.log("connectStream called, orderId:", orderId);
      try {
        console.log("fetching stream token...");
        const res = await fetch(`/api/stream-token?orderId=${orderId}`);
        const data = await res.json();
        if (!res.ok || !data.token) return;

        if (cancelled) return;

        const wsUrl = `wss://bridge.extrudly.com/stream?token=${data.token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.binaryType = "arraybuffer";

        ws.onopen = () => setStreamConnected(true);
        ws.onclose = () => setStreamConnected(false);
        ws.onerror = () => setStreamConnected(false);

        ws.onmessage = (event) => {
          const blob = new Blob([event.data], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
          };
          img.src = url;
        };
      } catch (err) {
        console.error("Stream connect error:", err);
      }
    }

    connectStream();

    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [orderId]);

  // ── Print status polling ──────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/print-status?orderId=${orderId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setPrintState(data);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Could not reach the server");
    }
  }, [orderId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const formatTime = (secs) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#F1EFE8] p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[2px] uppercase text-[#EF9F27] mb-1">Live print status</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2C2C2A]">
              {printState?.filename ?? "Your order"}
            </h1>
          </div>
          {printState && <StatusBadge status={printState.status} />}
        </div>

        {/* Camera */}
        <div className="bg-[#2C2C2A] rounded-2xl overflow-hidden aspect-video relative">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          {!streamConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#888780]">Connecting to camera...</p>
            </div>
          )}
          {streamConnected && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-white font-medium">LIVE</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-red-400 mt-1">We'll keep trying to reconnect...</p>
          </div>
        ) : !printState ? (
          <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="bg-white rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#2C2C2A]">Progress</span>
                  <span className="text-2xl font-extrabold text-[#EF9F27]">{printState.progress}%</span>
                </div>
                <div className="h-3 bg-[#F1EFE8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF9F27] rounded-full transition-all duration-500"
                    style={{ width: `${printState.progress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#F1EFE8]">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#888780] font-medium">Layer</span>
                  <span className="text-2xl font-bold text-[#2C2C2A]">
                    {printState.layer ?? "—"}
                    {printState.totalLayers ? (
                      <span className="text-sm font-normal text-[#888780]"> / {printState.totalLayers}</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#888780] font-medium">Time remaining</span>
                  <span className="text-2xl font-bold text-[#2C2C2A]">{formatTime(printState.remainingSecs)}</span>
                </div>
              </div>
            </div>

            {/* Temps */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold tracking-[2px] uppercase text-[#888780] mb-4">Temperatures</p>
              <div className="grid grid-cols-2 gap-6">
                <TempGauge label="Nozzle" current={printState.nozzleTemp} target={printState.nozzleTarget} />
                <TempGauge label="Bed" current={printState.bedTemp} target={printState.bedTarget} />
              </div>
            </div>

            {lastUpdated && (
              <div className="flex items-center justify-center gap-2 text-xs text-[#888780]">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live · updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
