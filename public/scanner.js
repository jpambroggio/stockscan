// ══════════════════════════════════════════════
// SCANNER UNIVERSAL
// Android/Chrome  → BarcodeDetector nativo
// iPhone/Safari   → cámara nativa via input file
// ══════════════════════════════════════════════

let camStream   = null;
let detecting   = false;
let lastCode    = null;
let detector    = null;
let scanMethod  = null;

const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const hasBarcodeDetector = 'BarcodeDetector' in window;

// ── Iniciar escáner según dispositivo ──
async function startCam() {
  initAudio();

  if (isiOS || !hasBarcodeDetector) {
    // iPhone / Safari → input file con cámara nativa
    startIOSScanner();
  } else {
    // Android / Chrome → BarcodeDetector nativo
    await startNativeScanner();
  }
}

// ══════════════════════════════════════════════
// MÉTODO iOS — input type=file capture
// ══════════════════════════════════════════════
function startIOSScanner() {
  scanMethod = 'ios';

  // Mostrar UI especial para iOS
  document.getElementById('camIdle').style.display  = 'none';
  document.getElementById('ov').style.display       = 'none';
  document.getElementById('ovHint').style.display   = 'none';
  document.getElementById('btnStop').style.display  = 'block';

  // Mostrar panel iOS
  const iosPanel = document.getElementById('iosPanel');
  if (iosPanel) iosPanel.style.display = 'flex';

  // Preparar BarcodeDetector para decodificar la foto
  if (hasBarcodeDetector) {
    detector = new BarcodeDetector({
      formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
    });
  }
}

async function capturarFotoIOS() {
  const input = document.getElementById('iosInput');
  input.click();
}

async function procesarFotoIOS(input) {
  const file = input.files[0];
  if (!file) return;

  const img = new Image();
  const url = URL.createObjectURL(file);

  img.onload = async () => {
    URL.revokeObjectURL(url);
    let code = null;

    // Intentar con BarcodeDetector primero (más rápido si está disponible)
    if (detector) {
      try {
        const barcodes = await detector.detect(img);
        if (barcodes.length > 0) code = barcodes[0].rawValue;
      } catch(e) {}
    }

    // Si no, usar ZXing en canvas
    if (!code) {
      code = await decodeWithCanvas(img);
    }

    if (code) {
      doFlash(); beep();
      await handleBarcode(code);
    } else {
      showToast('No se detectó código — intentá de nuevo', 'er');
    }

    // Limpiar input para poder volver a capturar
    input.value = '';
  };

  img.src = url;
}

async function decodeWithCanvas(img) {
  return new Promise(res => {
    try {
      const canvas  = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      if (typeof ZXing === 'undefined') {
        // Cargar ZXing dinámicamente
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
        script.onload = async () => {
          const result = await zxingDecode(canvas);
          res(result);
        };
        document.head.appendChild(script);
      } else {
        zxingDecode(canvas).then(res);
      }
    } catch(e) { res(null); }
  });
}

async function zxingDecode(canvas) {
  try {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    const reader = new ZXing.BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromCanvas(canvas);
    return result ? result.getText() : null;
  } catch(e) { return null; }
}

// ══════════════════════════════════════════════
// MÉTODO NATIVO — BarcodeDetector (Android)
// ══════════════════════════════════════════════
async function startNativeScanner() {
  scanMethod = 'native';
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    const video = document.getElementById('video');
    video.srcObject = camStream;
    video.setAttribute('playsinline', true);
    video.muted = true;
    await video.play();

    document.getElementById('camIdle').style.display = 'none';
    document.getElementById('ov').style.display      = 'flex';
    document.getElementById('ovHint').style.display  = 'block';
    document.getElementById('btnStop').style.display = 'block';

    detector = new BarcodeDetector({
      formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
    });
    detecting = true;
    detectLoopNative();

  } catch(e) {
    let msg = '❌ Error de cámara';
    if (e.name === 'NotAllowedError')  msg = '❌ Permiso denegado';
    if (e.name === 'NotFoundError')    msg = '❌ Sin cámara trasera';
    if (e.name === 'NotReadableError') msg = '❌ Cámara en uso';
    showToast(msg, 'er');
    resetCamUI();
  }
}

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

// ══════════════════════════════════════════════
// STOP
// ══════════════════════════════════════════════
function stopCam() {
  detecting = false;

  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }

  const video = document.getElementById('video');
  if (video.srcObject) {
    video.srcObject = null;
    video.load();
  }

  const iosPanel = document.getElementById('iosPanel');
  if (iosPanel) iosPanel.style.display = 'none';

  resetCamUI();
  lastCode   = null;
  scanMethod = null;
  detector   = null;
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
