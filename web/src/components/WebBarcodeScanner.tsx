import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Flashlight, Upload, CheckCircle2, AlertTriangle, VideoOff } from 'lucide-react';

interface WebBarcodeScannerProps {
  active: boolean;
  onDetected: (code: string, format?: string) => void;
  hintText?: string;
}

// Tablas estándar EAN-13 / UPC-A (ancho de barras relativo L/G/R)
const EAN_L_CODES: Record<string, string> = {
  '3211': '0', '2221': '1', '2122': '2', '1411': '3', '1132': '4',
  '1231': '5', '1114': '6', '1312': '7', '1213': '8', '3112': '9',
};
const EAN_G_CODES: Record<string, string> = {
  '1123': '0', '1222': '1', '2212': '2', '1141': '3', '2311': '4',
  '1321': '5', '4111': '6', '2131': '7', '3121': '8', '2113': '9',
};
const EAN_PARITY_PREFIX: Record<string, string> = {
  LLLLLL: '0', LLGLGG: '1', LLGGLG: '2', LLGGGL: '3', LGLLGG: '4',
  LGGLLG: '5', LGGGLL: '6', LGLGLG: '7', LGLGGL: '8', LGGLGL: '9',
};

function isValidEanChecksum(digits: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(digits)) return false;
  const padded = digits.length === 12 ? `0${digits}` : digits;
  const len = padded.length;
  let sum = 0;
  for (let i = 0; i < len - 1; i++) {
    const num = parseInt(padded[i], 10);
    if (len === 13) {
      sum += i % 2 === 0 ? num : num * 3;
    } else {
      sum += i % 2 === 0 ? num * 3 : num;
    }
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(padded[len - 1], 10);
}

function quantizeModule4(widths: number[]): string | null {
  const total = widths[0] + widths[1] + widths[2] + widths[3];
  if (total <= 0) return null;
  const unit = total / 7;
  const q = widths.map((w) => Math.max(1, Math.min(4, Math.round(w / unit))));
  const sum = q[0] + q[1] + q[2] + q[3];
  if (sum !== 7) return null;
  return q.join('');
}

/**
 * Decodificador puro de líneas de escaneo 1D EAN-13 desde una fila de píxeles RGBA.
 * Sirve como fallback offline en navegadores sin API nativa BarcodeDetector (Firefox/Safari).
 */
function decodeEan13FromScanline(lumaRow: Uint8Array, width: number): string | null {
  let min = 255;
  let max = 0;
  for (let x = 0; x < width; x++) {
    const v = lumaRow[x];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < 32) return null;
  const threshold = (min + max) * 0.5;

  const runs: Array<{ dark: boolean; len: number }> = [];
  let curDark = lumaRow[0] < threshold;
  let curLen = 1;
  for (let x = 1; x < width; x++) {
    const isDark = lumaRow[x] < threshold;
    if (isDark === curDark) {
      curLen++;
    } else {
      runs.push({ dark: curDark, len: curLen });
      curDark = isDark;
      curLen = 1;
    }
  }
  runs.push({ dark: curDark, len: curLen });

  // Un EAN-13 válido posee exactamente 59 barras/espacios alternados entre guardas:
  // 3 (inicio) + 24 (6 dígitos izq) + 5 (centro) + 24 (6 dígitos der) + 3 (fin) = 59
  if (runs.length < 59) return null;

  for (let start = 0; start <= runs.length - 59; start++) {
    if (!runs[start].dark) continue;
    const g1 = runs[start].len;
    const g2 = runs[start + 1].len;
    const g3 = runs[start + 2].len;
    const unit = (g1 + g2 + g3) / 3;
    if (unit < 1) continue;
    if (
      Math.abs(g1 - unit) > unit * 0.7 ||
      Math.abs(g2 - unit) > unit * 0.7 ||
      Math.abs(g3 - unit) > unit * 0.7
    ) {
      continue;
    }

    // Verificar guarda central (runs[start + 27 .. start + 31])
    const midIdx = start + 27;
    if (runs[midIdx].dark) continue; // espacio-barra-espacio-barra-espacio

    let parity = '';
    let leftDigits = '';
    let valid = true;

    for (let d = 0; d < 6; d++) {
      const idx = start + 3 + d * 4;
      const key = quantizeModule4([runs[idx].len, runs[idx + 1].len, runs[idx + 2].len, runs[idx + 3].len]);
      if (!key) {
        valid = false;
        break;
      }
      if (EAN_L_CODES[key]) {
        leftDigits += EAN_L_CODES[key];
        parity += 'L';
      } else if (EAN_G_CODES[key]) {
        leftDigits += EAN_G_CODES[key];
        parity += 'G';
      } else {
        valid = false;
        break;
      }
    }

    if (!valid) continue;
    const firstDigit = EAN_PARITY_PREFIX[parity];
    if (!firstDigit) continue;

    let rightDigits = '';
    for (let d = 0; d < 6; d++) {
      const idx = start + 32 + d * 4;
      const key = quantizeModule4([runs[idx].len, runs[idx + 1].len, runs[idx + 2].len, runs[idx + 3].len]);
      if (!key || !EAN_L_CODES[key]) {
        valid = false;
        break;
      }
      rightDigits += EAN_L_CODES[key];
    }

    if (!valid) continue;

    const fullCode = `${firstDigit}${leftDigits}${rightDigits}`;
    if (isValidEanChecksum(fullCode)) {
      return fullCode;
    }
  }

  return null;
}

function decodeBarcodeFromCanvasFallback(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  const fractions = [0.5, 0.42, 0.58, 0.35, 0.65];

  for (const frac of fractions) {
    const y = Math.floor(height * frac);
    const img = ctx.getImageData(0, y, width, 1).data;
    const luma = new Uint8Array(width);
    for (let x = 0; x < width; x++) {
      const i = x * 4;
      luma[x] = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]);
    }
    const found = decodeEan13FromScanline(luma, width);
    if (found) return found;
  }
  return null;
}

function playBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {}
}

/**
 * Lector real de códigos de barras por cámara Web para Inventario y POS.
 * Usa `BarcodeDetector` nativo (Chrome/Edge/Android) y fallback pure-TS EAN-13/UPC-A en canvas,
 * más selector de cámaras, linterna y subida/captura directa de foto.
 */
export const WebBarcodeScanner: React.FC<WebBarcodeScannerProps> = ({
  active,
  onDetected,
  hintText = 'Coloca el código de barras dentro del recuadro turquesa',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('Iniciando cámara...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flashDetected, setFlashDetected] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const emitDetection = useCallback(
    (rawCode: string, format?: string) => {
      const code = rawCode.trim();
      if (!code) return;
      const now = Date.now();
      if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < 1800) {
        return;
      }
      lastCodeRef.current = { code, at: now };
      playBeep();
      setFlashDetected(code);
      setTimeout(() => setFlashDetected(null), 900);
      onDetected(code, format);
    },
    [onDetected]
  );

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setErrorMsg(null);
      setStatusMsg('Solicitando permiso de cámara...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg(
          window.isSecureContext
            ? 'Este navegador no soporta acceso directo a la cámara.'
            : 'El navegador requiere HTTPS (o localhost) para activar la cámara en vivo. Puedes tomar o subir una foto del código.'
        );
        return;
      }

      try {
        stopCamera();
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.();
        setTorchSupported(Boolean(caps?.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
        } catch {}

        const hasNative = 'BarcodeDetector' in window;
        setStatusMsg(
          hasNative
            ? 'Escáner óptico en vivo activo (EAN-13 / UPC / Code128 / QR)'
            : 'Escáner en vivo activo (modo compatible EAN-13 / foto)'
        );
      } catch (err: any) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg('Permiso de cámara denegado. Habilítalo en el ícono de candado del navegador o usa captura por foto.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg('No se detectó ninguna cámara conectada en este dispositivo.');
        } else {
          setErrorMsg('No se pudo inicializar la cámara en vivo. Puedes subir/capturar una imagen del código.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, selectedDeviceId, stopCamera]);

  // Bucle de lectura continuo sobre frames de video
  useEffect(() => {
    if (!active || errorMsg) return;

    let cancelled = false;
    let detector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          if (detector) {
            const barcodes = await detector.detect(video);
            if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0]?.rawValue) {
              emitDetection(barcodes[0].rawValue, barcodes[0].format);
            }
          } else {
            const canvas = canvasRef.current || document.createElement('canvas');
            canvasRef.current = canvas;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const decoded = decodeBarcodeFromCanvasFallback(canvas);
              if (decoded) {
                emitDetection(decoded, 'ean_13');
              }
            }
          }
        } catch {}
      }
      if (!cancelled) {
        setTimeout(scanFrame, 180);
      }
    };

    const timer = setTimeout(scanFrame, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, errorMsg, emitDetection]);

  const handleToggleTorch = async () => {
    const track: any = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {}
  };

  const handleCapturePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
        const detected = await detector.detect(canvas);
        if (detected?.length > 0 && detected[0].rawValue) {
          emitDetection(detected[0].rawValue, detected[0].format);
          return;
        }
      }

      const fallbackCode = decodeBarcodeFromCanvasFallback(canvas);
      if (fallbackCode) {
        emitDetection(fallbackCode, 'ean_13');
      } else {
        setStatusMsg('No se detectó un código nítido en la imagen. Intenta acercar o mejorar la luz.');
      }
    } catch {
      setStatusMsg('No se pudo procesar la fotografía seleccionada.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const next = devices[(idx + 1) % devices.length];
    setSelectedDeviceId(next.deviceId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
      <div
        style={{
          position: 'relative',
          height: '210px',
          backgroundColor: '#061426',
          borderRadius: '12px',
          border: flashDetected ? '2px solid #00E6C3' : '1px solid rgba(0, 230, 195, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!errorMsg ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Guía visual de enfoque */}
            <div
              style={{
                position: 'absolute',
                width: '230px',
                height: '104px',
                border: '2px dashed #00E6C3',
                borderRadius: '10px',
                boxShadow: '0 0 0 9999px rgba(6, 20, 38, 0.38)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: '88%', height: '2px', backgroundColor: 'rgba(0, 230, 195, 0.75)' }} />
            </div>

            {flashDetected && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  backgroundColor: 'rgba(0, 230, 195, 0.94)',
                  color: '#061426',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Detectado: {flashDetected}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '18px', textAlign: 'center', maxWidth: '380px' }}>
            <VideoOff size={28} color="#F59E0B" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '12px', color: '#FCA5A5', lineHeight: 1.45 }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Controles de cámara y fallback por foto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#A7B8CC', display: 'flex', alignItems: 'center', gap: '5px' }}>
          {errorMsg ? <AlertTriangle size={13} color="#F59E0B" /> : <Camera size={13} color="#00E6C3" />}
          <span>{errorMsg ? hintText : statusMsg}</span>
        </span>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {devices.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 230, 195, 0.35)',
                backgroundColor: '#0A1D3A',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
              <span>Cambiar Cámara</span>
            </button>
          )}

          {torchSupported && (
            <button
              type="button"
              onClick={handleToggleTorch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 230, 195, 0.35)',
                backgroundColor: torchOn ? '#00E6C3' : '#0A1D3A',
                color: torchOn ? '#061426' : '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Flashlight size={12} />
              <span>{torchOn ? 'Apagar Luz' : 'Linterna'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 230, 195, 0.35)',
              backgroundColor: '#0A1D3A',
              color: '#00E6C3',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Upload size={12} />
            <span>Foto / Archivo</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapturePhotoFile}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

