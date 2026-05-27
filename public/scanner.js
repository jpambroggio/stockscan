// ══════════════════════════════════════════════
// SCANNER UNIVERSAL
// Android/Chrome → BarcodeDetector nativo
// iPhone/Safari  → ZXing via canvas
// ══════════════════════════════════════════════

let camStream  = null;
let detecting  = false;
let lastCode   = null;
let detector   = null;
let zxingReader = null;
let scanMethod  = null; // 'native' | 'zxing'

async function startCam() {
  initAudio();

  try {
    // iPhone necesita constraints más simples
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const constraints = isiOS
      ? { video: { facingMode: { ideal: 'environment' } } }
      : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } };

    camStream = await navigator.mediaDevices.getUserMedia(constraints);

    const video = document.getElementById('video');
    video.srcObject = camStream;

    // iPhone requiere que el video esté en el DOM visible y con atributos específicos
    video.setAttribute('playsinline', true);
    video.setAttribute('autoplay', true);
    video.setAttribute('muted', true);
    video.muted = true;

    await new Promise((res, rej) => {
      video.onloadedmetadata = () => {
        video.play().then(res).catch(rej);
      };
      setTimeout(rej, 5000); // timeout
    });

    document.getElementById('camIdle').style.display = 'none';
    document.getElementById('ov').style.display      = 'flex';
    document.getElementById('ovHint').style.display  = 'block';
    document.getElementById('btnStop').style.display = 'block';

    // Elegir método
    if ('BarcodeDetector' in window) {
      scanMethod = 'native';
      detector = new BarcodeDetector({
        formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
      });
      detecting = true;
      detectLoopNative();
    } else {
      // iOS / Safari / browsers sin BarcodeDetector → ZXing
      scanMethod = 'zxing';
      startZXing(video);
    }

  } catch(e) {
    let msg = '❌ Error de cámara';
    if (e.name === 'NotAllowedError')  msg = '❌ Permiso de cámara denegado';
    if (e.name === 'NotFoundError')    msg = '❌ No se encontró cámara';
    if (e.name === 'NotReadableError') msg = '❌ Cámara en uso por otra app';
    showToast(msg, 'er');
    resetCamUI();
  }
}

// ── MÉTODO 1: BarcodeDetector nativo (Android/Chrome) ──
async function detectLoopNative() {
  if (!detecting) return;
  const video = document.getElementById('video');
  try {
    if (video.readyState >= 2) {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        if (code && code !== lastCode) {
          lastCode = code;
          doFlash(); beep();
          await handleBarcode(code);
          setTimeout(() => lastCode = null, 3000);
        }
      }
    }
  } catch(e) {}
  requestAnimationFrame(detectLoopNative);
}

// ── MÉTODO 2: ZXing (iOS/Safari) ──
function startZXing(video) {
  if (typeof ZXing === 'undefined') {
    // Cargar ZXing dinámicamente
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
    script.onload  = () => initZXing(video);
    script.onerror = () => showToast('❌ Error cargando escáner', 'er');
    document.head.appendChild(script);
  } else {
    initZXing(video);
  }
}

function initZXing(video) {
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
  ]);

  zxingReader = new ZXing.BrowserMultiFormatReader(hints, 300);
  detecting = true;

  zxingReader.decodeFromVideoElement(video, async (result, err) => {
    if (!detecting) return;
    if (result) {
      const code = result.getText();
      if (code && code !== lastCode) {
        lastCode = code;
        doFlash(); beep();
        await handleBarcode(code);
        setTimeout(() => lastCode = null, 3000);
      }
    }
  });
}

function stopCam() {
  detecting = false;

  if (scanMethod === 'zxing' && zxingReader) {
    try { zxingReader.reset(); } catch(e) {}
    zxingReader = null;
  }

  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }

  const video = document.getElementById('video');
  video.srcObject = null;
  video.load(); // importante en iOS para liberar la cámara

  resetCamUI();
  lastCode = null;
  scanMethod = null;
}

function resetCamUI() {
  document.getElementById('camIdle').style.display = 'flex';
  document.getElementById('ov').style.display      = 'none';
  document.getElementById('ovHint').style.display  = 'none';
  document.getElementById('btnStop').style.display = 'none';
}

function doFlash() {
  const f = document.getElementById('flash');
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 120);
}
