(function () {
  'use strict';

  const MU0 = 4 * Math.PI * 1e-7;

  const magState = {
    I_A:    6.0,
    R_mm:   1.5,
    r_mm:   1.0,
    mode:   'cross',
    dir:    'in',
  };

  const pad = { l: 70, r: 24, t: 28, b: 52 };

  function magCalcB_SI(r_m, R_m, I) {
    if (r_m <= 0) return 0;
    if (r_m <= R_m) {
      return (MU0 * I * r_m) / (2 * Math.PI * R_m * R_m);
    } else {
      return (MU0 * I) / (2 * Math.PI * r_m);
    }
  }

  function magPhysics() {
    const R_m = magState.R_mm * 1e-3;
    const r_m = magState.r_mm * 1e-3;
    const B_T = magCalcB_SI(r_m, R_m, magState.I_A);
    return { B_T };
  }

  function magFormatSI(val, unit) {
    if (val >= 1)    return [val.toFixed(4),          unit       ];
    if (val >= 1e-3) return [(val * 1e3).toFixed(3),  'm' + unit];
    if (val >= 1e-6) return [(val * 1e6).toFixed(3),  'µ' + unit];
    if (val >= 1e-9) return [(val * 1e9).toFixed(3),  'n' + unit];
    return [(val * 1e12).toFixed(3), 'p' + unit];
  }

  const cv  = document.getElementById('cvMagnetic');
  const ctx = cv.getContext('2d');
  let W = 0, H = 360, cx = 0, cy = 0;

  function magResizeCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const cssW = cv.parentElement.clientWidth;
    if (!cssW) return;
    cv.width   = Math.round(cssW * dpr);
    cv.height  = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W  = cssW;
    cx = W / 2;
    cy = H / 2;
  }

  function magDrawArrow(x1, y1, x2, y2, color, lw) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw || 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 3);
    ctx.lineTo(-7, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function magGetPxPerMm() {
    const maxR_px = Math.min(W, H) * 0.38;
    return maxR_px / magState.R_mm;
  }

  function magDrawCross() {
    ctx.clearRect(0, 0, W, H);

    const ppm   = magGetPxPerMm();
    const R_px  = magState.R_mm * ppm;
    const r_px  = magState.r_mm * ppm;
    const R_m   = magState.R_mm * 1e-3;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R_px, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(184,115,44,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#b8732c';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffcf8a';
    ctx.fillStyle   = '#ffcf8a';
    ctx.lineWidth   = 2.5;
    if (magState.dir === 'in') {
      const s = 9;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    const B_at_R = magCalcB_SI(R_m, R_m, magState.I_A);
    const radiiFrac = [0.4, 0.75, 1.0, 1.4, 1.9, 2.5, 3.1];

    const ccw = magState.dir === 'out';

    for (const frac of radiiFrac) {
      const rad_mm = magState.R_mm * frac;
      const rad_px = rad_mm * ppm;
      if (rad_px > Math.min(W, H) / 2 - 10) continue;

      const B_local = magCalcB_SI(rad_mm * 1e-3, R_m, magState.I_A);
      const ratio   = B_at_R > 0 ? Math.min(1, B_local / B_at_R) : 0;
      const alpha   = Math.max(0.15, Math.min(0.85, 0.12 + ratio * 0.75));

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rad_px, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,240,255,${alpha.toFixed(2)})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();

      const numArrows = 4;
      for (let k = 0; k < numArrows; k++) {
        const baseAngle = (k / numArrows) * Math.PI * 2 + Math.PI / 8;
        const dTheta = ccw ? -0.12 : 0.12;
        const a0 = baseAngle;
        const a1 = baseAngle + dTheta;
        const x0 = cx + Math.cos(a0) * rad_px;
        const y0 = cy + Math.sin(a0) * rad_px;
        const x1 = cx + Math.cos(a1) * rad_px;
        const y1 = cy + Math.sin(a1) * rad_px;
        magDrawArrow(x0, y0, x1, y1, `rgba(0,240,255,${Math.min(1, alpha + 0.2).toFixed(2)})`, 1.6);
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r_px, cy);
    ctx.strokeStyle = 'rgba(208,0,255,0.4)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    const nx = cx + r_px;
    ctx.save();
    ctx.beginPath();
    ctx.arc(nx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle   = '#d000ff';
    ctx.fill();
    ctx.strokeStyle = '#f3a8ff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font      = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#d99a5c';
    ctx.fillText(`R = ${magState.R_mm.toFixed(1)} mm`, cx + 6, cy - R_px - 8);

    ctx.fillStyle = '#e577ff';
    const rLabel = magState.r_mm <= magState.R_mm ? 'r (interior)' : 'r (exterior)';
    ctx.fillText(rLabel, cx + 4, cy - r_px - 8);

    ctx.fillStyle = '#f3a8ff';
    ctx.fillText(`${magState.r_mm.toFixed(2)} mm`, nx + 10, cy + 4);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b8732c';
    ctx.fill();
    ctx.restore();
  }

  function magGetGraphLimits() {
    const maxR_mm = magState.R_mm * 3.2;
    const R_m  = magState.R_mm * 1e-3;
    const B_peak  = magCalcB_SI(R_m, R_m, magState.I_A);
    const maxB    = B_peak * 1.25;
    return { maxR_mm, maxB };
  }

  function magDrawGraph() {
    ctx.clearRect(0, 0, W, H);

    const gW  = W - pad.l - pad.r;
    const gH  = H - pad.t - pad.b;

    const R_mm = magState.R_mm;
    const R_m  = R_mm * 1e-3;
    const I    = magState.I_A;

    const { maxR_mm, maxB } = magGetGraphLimits();

    const xOf = (r_mm) => pad.l + (r_mm / maxR_mm) * gW;
    const yOf = (B)     => pad.t + gH - Math.min(1, B / maxB) * gH;

    const x_R = xOf(R_mm);
    ctx.fillStyle = 'rgba(208,0,255,0.05)';
    ctx.fillRect(pad.l, pad.t, x_R - pad.l, gH);

    ctx.save();
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const YTICKS = 5;
    for (let i = 0; i <= YTICKS; i++) {
      const frac = i / YTICKS;
      const Bval = maxB * (1 - frac);
      const y    = pad.t + frac * gH;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + gW, y);
      ctx.stroke();
      const [bStr] = magFormatSI(Bval, '');
      ctx.fillStyle = '#666';
      ctx.fillText(bStr, pad.l - 6, y + 4);
    }
    ctx.restore();

    const NPTS = 500;
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    for (let i = 1; i <= NPTS; i++) {
      const r_mm = (i / NPTS) * maxR_mm;
      const r_m  = r_mm * 1e-3;
      const B    = magCalcB_SI(r_m, R_m, I);
      const x    = xOf(r_mm);
      const y    = yOf(B);
      i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    const r_m_now = magState.r_mm * 1e-3;
    const Bnow     = magCalcB_SI(r_m_now, R_m, I);
    const rx = xOf(magState.r_mm);
    const ry = yOf(Bnow);

    ctx.save();
    ctx.strokeStyle = 'rgba(208,0,255,0.45)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, pad.t + gH); ctx.lineTo(rx, ry);
    ctx.moveTo(pad.l,   ry);    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fillStyle   = '#d000ff';
    ctx.fill();
    ctx.strokeStyle = '#f3a8ff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(184,115,44,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(x_R, pad.t);
    ctx.lineTo(x_R, pad.t + gH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d99a5c';
    ctx.font      = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R', x_R, pad.t + gH + 14);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + gH);
    ctx.lineTo(pad.l + gW, pad.t + gH);
    ctx.stroke();

    ctx.fillStyle = '#777';
    ctx.font      = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';

    const XTICKS = 6;
    for (let i = 0; i <= XTICKS; i++) {
      const r_mm = (i / XTICKS) * maxR_mm;
      const x    = xOf(r_mm);
      ctx.fillText(r_mm.toFixed(1), x, pad.t + gH + 16);
    }
    ctx.fillText('distancia radial r (mm)', pad.l + gW / 2, H - 6);

    ctx.save();
    ctx.translate(14, pad.t + gH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Campo Magnético B (T)', 0, 0);
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a85ce0';
    ctx.fillText('B ∝ r', pad.l + 6, pad.t + 14);
    ctx.fillStyle = '#3ac8d6';
    ctx.fillText('B ∝ 1/r', x_R + 6, pad.t + 14);
    ctx.restore();
  }

  function magUpdateMetrics() {
    const { B_T } = magPhysics();
    const interior = magState.r_mm <= magState.R_mm;

    document.getElementById('metMagR').textContent = magState.r_mm.toFixed(2);

    const [Bstr, Bunit] = magFormatSI(B_T, 'T');
    document.getElementById('metMagB').textContent  = Bstr;
    document.getElementById('metMagBu').textContent = Bunit;

    const eqBox = document.getElementById('magEqBox');
    if (interior) {
      eqBox.innerHTML = `
        <span class="mag-eq-zone-tag interior">r ≤ R — Zona Interior</span><br>
        <strong>Ley de Ampère (conductor sólido):</strong><br>
        <code>B = (μ₀ · I · r) / (2π · R²)</code>
        &nbsp;→&nbsp; B crece linealmente con r desde el centro
      `;
    } else {
      eqBox.innerHTML = `
        <span class="mag-eq-zone-tag exterior">r &gt; R — Zona Exterior</span><br>
        <strong>Ley de Ampère (conductor ideal/filiforme):</strong><br>
        <code>B = (μ₀ · I) / (2π · r)</code>
        &nbsp;→&nbsp; B decae de forma inversamente proporcional a r
      `;
    }
  }

  function magRender() {
    if (magState.mode === 'cross') magDrawCross();
    else                            magDrawGraph();
    magUpdateMetrics();
  }

  // Expuesto para que showSection() pueda re-dimensionar y re-renderizar
  // cuando esta pestaña se hace visible (antes el canvas se quedaba en 0x0
  // porque al iniciar la página la sección estaba oculta con display:none).
  window.magResizeAndRender = function () {
    magResizeCanvas();
    magRender();
  };

  function magBindSliders() {
    const slI = document.getElementById('slMagCurrent');
    const slR = document.getElementById('slMagRadius');

    slI.addEventListener('input', () => {
      magState.I_A = parseFloat(slI.value);
      document.getElementById('valMagCurrent').textContent = magState.I_A.toFixed(1);
      magRender();
    });

    slR.addEventListener('input', () => {
      magState.R_mm = parseFloat(slR.value);
      document.getElementById('valMagRadius').textContent = magState.R_mm.toFixed(1);
      const maxR_lim = magState.R_mm * 3.1;
      if (magState.r_mm > maxR_lim) magState.r_mm = maxR_lim;
      magRender();
    });
  }

  function magBindModeTabs() {
    document.querySelectorAll('#magModeGroup .mag-mode-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#magModeGroup .mag-mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        magState.mode = this.dataset.mode;
        magRender();
      });
    });
  }

  function magBindDirToggle() {
    document.querySelectorAll('#magDirGroup .mag-dir-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#magDirGroup .mag-dir-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        magState.dir = this.dataset.dir;
        magRender();
      });
    });
  }

  let magDragging = false;

  function magGetLogicalCoords(clientX, clientY) {
    const rect = cv.getBoundingClientRect();
    return {
      lx: clientX - rect.left,
      ly: clientY - rect.top
    };
  }

  function magApplyDrag(clientX) {
    const { lx } = magGetLogicalCoords(clientX, 0);
    const clampMax = magState.R_mm * 3.05;

    if (magState.mode === 'cross') {
      const ppm = magGetPxPerMm();
      const delta_px = lx - cx;
      const r_mm_new = Math.abs(delta_px) / ppm;
      magState.r_mm = Math.max(0.02, Math.min(clampMax, r_mm_new));
    } else {
      const gW = W - pad.l - pad.r;
      const { maxR_mm } = magGetGraphLimits();
      const pct = (lx - pad.l) / gW;
      const r_mm_new = pct * maxR_mm;
      magState.r_mm = Math.max(0.02, Math.min(clampMax, r_mm_new));
    }
    magRender();
  }

  function magIsNearNode(clientX, clientY) {
    const { lx, ly } = magGetLogicalCoords(clientX, clientY);

    if (magState.mode === 'cross') {
      const ppm = magGetPxPerMm();
      const nx = cx + magState.r_mm * ppm;
      const ny = cy;
      return Math.hypot(lx - nx, ly - ny) < 18;
    } else {
      const gW = W - pad.l - pad.r;
      const gH = H - pad.t - pad.b;
      const { maxR_mm, maxB } = magGetGraphLimits();

      const rx = pad.l + (magState.r_mm / maxR_mm) * gW;
      const Bnow = magCalcB_SI(magState.r_mm * 1e-3, magState.R_mm * 1e-3, magState.I_A);
      const ry = pad.t + gH - Math.min(1, Bnow / maxB) * gH;

      return Math.hypot(lx - rx, ly - ry) < 18;
    }
  }

  function magBindDrag() {
    cv.addEventListener('mousedown', e => {
      if (magIsNearNode(e.clientX, e.clientY)) {
        magDragging = true;
        cv.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });
    window.addEventListener('mousemove', e => {
      if (!magDragging) return;
      magApplyDrag(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      if (magDragging) { magDragging = false; cv.style.cursor = ''; }
    });
    cv.addEventListener('mousemove', e => {
      if (magDragging) return;
      cv.style.cursor = magIsNearNode(e.clientX, e.clientY) ? 'ew-resize' : '';
    });

    cv.addEventListener('touchstart', e => {
      const t = e.touches[0];
      if (magIsNearNode(t.clientX, t.clientY)) {
        magDragging = true;
        e.preventDefault();
      }
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      if (!magDragging) return;
      e.preventDefault();
      magApplyDrag(e.touches[0].clientX);
    }, { passive: false });
    cv.addEventListener('touchend', () => { magDragging = false; });
  }

  window.addEventListener('resize', () => {
    magResizeCanvas();
    magRender();
  });

  requestAnimationFrame(function magInit() {
    magResizeCanvas();
    magState.r_mm = magState.R_mm * 0.65;
    magBindSliders();
    magBindModeTabs();
    magBindDirToggle();
    magBindDrag();
    cv.classList.add('draggable');
    magRender();
  });

})();

(function () {
  'use strict';

  /* ── ESTADO INTERNO ── */
  const indState = {
    mode:        'manual',
    N:           2,
    magnetX:     -0.75,
    autoT:       0,

    prevPhi_mWb: 0,
    rawDPhiDt:   0,
    dPhiDt_mWbS: 0,
    emf_mV:      0,

    prevDragX:   null,
    prevDragTs:  null,
  };

  const A_cm2  = 60;
  const Bmax_T = 0.5;

  /* ── ECUACIONES FÍSICAS ── */
  function perfilGaussiano(xNorm) {
    const sigma = 0.42;
    return Math.exp(-(xNorm * xNorm) / (2 * sigma * sigma));
  }

  function calcPhi_mWb(xNorm) {
    const A_m2   = A_cm2 * 1e-4;
    const Bloc   = Bmax_T * perfilGaussiano(xNorm);
    const Phi_Wb = Bloc * A_m2;
    return Phi_Wb * 1e3;
  }

  const phiMax_mWb = calcPhi_mWb(0);

  /* ── FILTRO PASO BAJO (LERP) ── */
  function lerpTowards(current, target, dt, smoothingPerSecond) {
    const alpha = 1 - Math.exp(-smoothingPerSecond * dt);
    return current + (target - current) * alpha;
  }

  function actualizarInduccion(dt) {
    if (dt <= 0) return;

    const phiNow = calcPhi_mWb(indState.magnetX);
    const dPhiRaw = (phiNow - indState.prevPhi_mWb) / dt;
    indState.prevPhi_mWb = phiNow;
    indState.rawDPhiDt = dPhiRaw;

    indState.dPhiDt_mWbS = lerpTowards(indState.dPhiDt_mWbS, dPhiRaw, dt, 10);
    const emfTarget = -indState.N * indState.dPhiDt_mWbS;
    indState.emf_mV = lerpTowards(indState.emf_mV, emfTarget, dt, 7);

    if (!indDragging && indState.mode !== 'auto') {
      indState.dPhiDt_mWbS = lerpTowards(indState.dPhiDt_mWbS, 0, dt, 6);
      indState.emf_mV      = lerpTowards(indState.emf_mV, 0, dt, 5);
    }
  }

  function fmt(val, decimals) {
    if (!isFinite(val)) return '0.00';
    return val.toFixed(decimals);
  }

  /* ── CONTROL DEL LIENZO (CANVAS) ── */
  const cv  = document.getElementById('cvInduction');
  const ctx = cv.getContext('2d');
  let W = 0, H = 320, cx = 0, cy = 0;

  // Inicializamos la geometría del imán preventivamente con valores por defecto
  let magnetGeom = { x0: 0, x1: 0, y0: 0, y1: 0, cx: 0 };

  function indResizeCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const cssW = cv.parentElement.clientWidth;
    if (!cssW) return;
    cv.width   = Math.round(cssW * dpr);
    cv.height  = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W  = cssW;
    cx = W / 2;
    cy = H / 2 + 10;
  }

  function coilCenterX() { return cx + 60; }

  function trackBounds() {
    const margin = 55;
    return { x0: margin, x1: W - margin, y: cy };
  }
  function normToPx(xNorm) {
    const { x0, x1 } = trackBounds();
    const span = (x1 - x0) / 2;
    return coilCenterX() + xNorm * span;
  }
  function pxToNorm(px) {
    const { x0, x1 } = trackBounds();
    const span = (x1 - x0) / 2;
    const n = (px - coilCenterX()) / span;
    return Math.max(-1.15, Math.min(1.15, n));
  }

  /* ── RENDERIZADO DE ELEMENTOS ── */
  function dibujarBobina() {
    const baseX   = coilCenterX();
    const coilRX  = 24;
    const coilRY  = 58;
    const loopGap = 13;
    const n = indState.N;
    const totalW = (n - 1) * loopGap;
    const startX = baseX - totalW / 2;

    const corriente = indState.emf_mV;
    const hayCorriente = Math.abs(corriente) > 0.04;
    const senseCW = corriente < 0;

    for (let i = 0; i < n; i++) {
      const lx = startX + i * loopGap;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(lx, cy, coilRX, coilRY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = hayCorriente ? '#ffd23f' : '#b8732c';
      ctx.lineWidth   = hayCorriente ? 2.5 : 2;
      ctx.globalAlpha = hayCorriente ? 1 : 0.7;
      ctx.shadowColor = hayCorriente ? '#ffd23f' : 'transparent';
      ctx.shadowBlur  = hayCorriente ? 8 : 0;
      ctx.stroke();
      ctx.restore();

      if (hayCorriente && i === n - 1) {
        const arrowAngles = [0.2, Math.PI - 0.2, Math.PI + 0.2, -0.2];
        for (const baseA of arrowAngles) {
          const dA = senseCW ? 0.2 : -0.2;
          const x0 = lx + Math.cos(baseA) * coilRX;
          const y0 = cy + Math.sin(baseA) * coilRY;
          const x1 = lx + Math.cos(baseA + dA) * coilRX;
          const y1 = cy + Math.sin(baseA + dA) * coilRY;
          indDrawArrow(x0, y0, x1, y1, '#ffe27a', 2);
        }
      }
    }

    ctx.save();
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText(`Bobina (N = ${n})`, baseX, cy + coilRY + 22);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.restore();
  }

  function dibujarIman() {
    const magW = 86, magH = 28;
    const px = normToPx(indState.magnetX);
    const x0 = px - magW / 2, x1 = px + magW / 2;
    const y0 = cy - magH / 2, y1 = cy + magH / 2;

    // Actualizamos las coordenadas reales globales
    magnetGeom = { x0, x1, y0, y1, cx: px };

    ctx.save();
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(x0, y0, magW / 2, magH);
    ctx.fillStyle = '#4da3ff';
    ctx.fillRect(x0 + magW / 2, y0, magW / 2, magH);
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, magW, magH);
    ctx.beginPath();
    ctx.moveTo(px, y0); ctx.lineTo(px, y1);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x0 + magW / 4, cy);
    ctx.fillText('S', x0 + 3 * magW / 4, cy);
    ctx.restore();
  }

  function dibujarLineasCampo() {
    const phiNow = calcPhi_mWb(indState.magnetX);
    const intensidad = phiMax_mWb > 0 ? Math.min(1, Math.abs(phiNow) / phiMax_mWb) : 0;
    const nLines = 5, spread = 64;

    ctx.save();
    for (let i = 0; i < nLines; i++) {
      const t = (i / (nLines - 1)) - 0.5;
      const yOff = t * spread;
      const alpha = 0.12 + intensidad * 0.55;

      ctx.strokeStyle = `rgba(155,89,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const nx = magnetGeom.x0, sx = magnetGeom.x1;
      const midY = cy + yOff;
      ctx.moveTo(nx, cy + yOff * 0.3);
      ctx.bezierCurveTo(nx - 36, midY, sx + 36, midY, sx, cy + yOff * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function indDrawArrow(x1, y1, x2, y2, color, lw) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, 2.5);
    ctx.lineTo(-6, -2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function dibujarVoltimetro() {
    const gx = cx, gy = 46, radius = 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, radius, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#0d0d0d';
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const r0 = radius - 7, r1 = radius;
      const x0 = gx + Math.cos(a) * r0, y0 = gy + Math.sin(a) * r0;
      const x1 = gx + Math.cos(a) * r1, y1 = gy + Math.sin(a) * r1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = i === 5 ? '#888' : '#3f3f3f';
      ctx.lineWidth = i === 5 ? 1.8 : 1;
      ctx.stroke();
    }

    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText('−', gx - radius + 10, gy - 6);
    ctx.fillText('+', gx + radius - 10, gy - 6);

    const emfRef = 6;
    const frac = Math.max(-1, Math.min(1, indState.emf_mV / emfRef));
    const needleAngle = Math.PI * 1.5 + (frac * Math.PI / 2 * 0.94);
    const nx = gx + Math.cos(needleAngle) * (radius - 10);
    const ny = gy + Math.sin(needleAngle) * (radius - 10);

    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = Math.abs(frac) > 0.02 ? '#ffd23f' : '#666';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = Math.abs(frac) > 0.02 ? '#ffd23f' : 'transparent';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(gx, gy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#777';
    ctx.fillText('Voltímetro (mV)', gx, gy + 18);
    ctx.restore();
  }

  // Se dibuja el imán primero para poblar sus límites espaciales antes de trazar el campo.
  function indRender() {
    ctx.clearRect(0, 0, W, H);
    dibujarIman();
    dibujarLineasCampo();
    dibujarBobina();
    dibujarVoltimetro();
    indUpdateMetrics();
  }

  /* ── TEXTOS DINÁMICOS Y MÉTRICAS ── */
  function indUpdateMetrics() {
    const phiNow = calcPhi_mWb(indState.magnetX);

    document.getElementById('metIndPhi').textContent  = fmt(phiNow, 3);
    document.getElementById('metIndDPhi').textContent = fmt(indState.dPhiDt_mWbS, 3);
    document.getElementById('metIndEmf').textContent  = fmt(indState.emf_mV, 3);

    const eqBox = document.getElementById('indEqBox');
    const emf = indState.emf_mV;
    const acercandose = indState.dPhiDt_mWbS > 0;

    if (Math.abs(emf) < 0.03) {
      eqBox.innerHTML = `
        <span class="ind-eq-tag idle">Sin variación de flujo</span><br>
        <strong>Ley de Faraday:</strong> <code>ε = -N · dΦ/dt</code><br>
        El imán está quieto o muy lejos de la bobina, por lo que <code>dΦ/dt ≈ 0</code> y no se induce voltaje.
      `;
    } else if (acercandose) {
      eqBox.innerHTML = `
        <span class="ind-eq-tag approach">Aproximando — Flujo aumentando</span><br>
        <strong>Ley de Faraday-Lenz:</strong> <code>ε = -N · dΦ/dt = ${fmt(emf, 2)} mV</code><br>
        El polo Norte se acerca a la bobina y el flujo aumenta. Por la Ley de Lenz, la corriente
        inducida genera un campo magnético que <strong>se opone</strong> al aumento de flujo, creando un polo Norte virtual
        en la cara izquierda de la bobina para repeler al imán.
      `;
    } else {
      eqBox.innerHTML = `
        <span class="ind-eq-tag recede">Alejando — Flujo disminuyendo</span><br>
        <strong>Ley de Faraday-Lenz:</strong> <code>ε = -N · dΦ/dt = ${fmt(emf, 2)} mV</code><br>
        El imán se aleja y el flujo disminuye. Por la Ley de Lenz, la corriente inducida
        genera un campo magnético hacia la derecha que intenta <strong>atraer y retener</strong> al imán, oponiéndose a la pérdida de flujo.
      `;
    }
  }

  /* ── VINCULACIÓN DE EVENTOS (INTERACCIÓN) ── */
  function indBindSlider() {
    const slN = document.getElementById('slIndN');
    slN.addEventListener('input', () => {
      indState.N = parseInt(slN.value, 10);
      document.getElementById('valIndN').textContent = indState.N;
    });
  }

  function indBindModeButtons() {
    document.querySelectorAll('#indModeGroup .ind-mode-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#indModeGroup .ind-mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        indState.mode = this.dataset.mode;
        cv.classList.toggle('draggable', indState.mode === 'manual');
        if (indState.mode === 'auto') indState.autoT = 0;
        indEnsureLoop();
      });
    });
  }

  let indDragging = false;

  function indGetLocalPos(clientX, clientY) {
    const rect = cv.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function indIsNearMagnet(clientX, clientY) {
    if (indState.mode !== 'manual') return false;
    const { x, y } = indGetLocalPos(clientX, clientY);
    return x >= magnetGeom.x0 - 10 && x <= magnetGeom.x1 + 10 &&
           y >= magnetGeom.y0 - 10 && y <= magnetGeom.y1 + 10;
  }

  function indApplyDrag(clientX) {
    if (indState.mode !== 'manual') return;
    const { x } = indGetLocalPos(clientX, 0);
    indState.magnetX = pxToNorm(x);
  }

  function indBindDrag() {
    cv.addEventListener('mousedown', e => {
      if (indIsNearMagnet(e.clientX, e.clientY)) {
        indDragging = true;
        cv.classList.add('dragging');
        indEnsureLoop();
        e.preventDefault();
      }
    });
    window.addEventListener('mousemove', e => {
      if (indDragging) {
        indApplyDrag(e.clientX);
      } else if (indState.mode === 'manual') {
        cv.classList.toggle('draggable', indIsNearMagnet(e.clientX, e.clientY));
      }
    });
    window.addEventListener('mouseup', () => {
      if (indDragging) { indDragging = false; cv.classList.remove('dragging'); }
    });

    cv.addEventListener('touchstart', e => {
      const t = e.touches[0];
      if (indIsNearMagnet(t.clientX, t.clientY)) {
        indDragging = true;
        cv.classList.add('dragging');
        indEnsureLoop();
        e.preventDefault();
      }
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      if (!indDragging) return;
      e.preventDefault();
      indApplyDrag(e.touches[0].clientX);
    }, { passive: false });
    cv.addEventListener('touchend', () => {
      indDragging = false;
      cv.classList.remove('dragging');
    });
  }

  /* ── BUCLE PRINCIPAL DE ANIMACIÓN ── */
  let indRafId = null;
  let indLoopLastTs = null;

  function indLoop(ts) {
    const dt = indLoopLastTs !== null ? Math.min((ts - indLoopLastTs) / 1000, 0.05) : 0;
    indLoopLastTs = ts;

    if (indState.mode === 'auto') {
      indState.autoT += dt;
      const omega = 1.6;
      indState.magnetX = 0.95 * Math.sin(omega * indState.autoT);
    }

    actualizarInduccion(dt);
    indRender();

    const enReposo = Math.abs(indState.emf_mV) < 0.01 && Math.abs(indState.dPhiDt_mWbS) < 0.01;
    const seguirAnimando = indState.mode === 'auto' || indDragging || !enReposo;

    if (seguirAnimando) {
      indRafId = requestAnimationFrame(indLoop);
    } else {
      indRafId = null;
      indLoopLastTs = null;
    }
  }

  function indEnsureLoop() {
    if (indRafId === null) {
      indLoopLastTs = null;
      indRafId = requestAnimationFrame(indLoop);
    }
  }

  // Expuesto para que showSection() pueda re-dimensionar y re-renderizar
  // cuando esta pestaña se hace visible, y además reanudar el loop de animación.
  window.indResizeAndRender = function () {
    indResizeCanvas();
    indRender();
    indEnsureLoop();
  };

  window.addEventListener('resize', () => {
    indResizeCanvas();
    indRender();
  });

  /* ── INICIALIZACIÓN DEFINITIVA ── */
  requestAnimationFrame(function indInit() {
    indResizeCanvas();
    indBindSlider();
    indBindModeButtons();
    indBindDrag();
    cv.classList.add('draggable');

    indState.prevPhi_mWb = calcPhi_mWb(indState.magnetX);
    indRender();
  });

})();

(function () {
  'use strict';

  const C_LUZ = 3e8;
  const wavState = {
    f_Hz:    1.0,
    E0:      40,
    phase:   0,
    paused:  false,
  };
  const C_VISUAL = 4;

  function wavPhysics() {
    const f = wavState.f_Hz;
    const lambda = C_VISUAL / f;
    const k      = (2 * Math.PI) / lambda;
    const omega  = 2 * Math.PI * f;
    const E0     = wavState.E0;
    const B0     = (E0 / C_LUZ) * 1e8;
    return { f, lambda, k, omega, E0, B0 };
  }

  function fmt(val, decimals) {
    if (!isFinite(val)) return '0.00';
    return val.toFixed(decimals);
  }

  let cv, ctx;
  let W = 0, H = 360;

  function wavResizeCanvas() {
    if (!cv) return;
    const dpr  = window.devicePixelRatio || 1;
    // Si clientWidth da 0 porque el contenedor está oculto, usamos un ancho mínimo razonable
    let cssW = cv.parentElement ? cv.parentElement.clientWidth : 0;
    if (cssW === 0) cssW = 740;

    cv.width   = Math.round(cssW * dpr);
    cv.height  = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW;
  }

  const ORIGIN_MARGIN_L = 50;
  const ORIGIN_MARGIN_R = 70;
  const Y_AXIS_ANGLE = -Math.PI / 5;
  const Y_AXIS_DIRX  = Math.cos(Y_AXIS_ANGLE) * 0.55;
  const Y_AXIS_DIRY  = Math.sin(Y_AXIS_ANGLE) * 0.55;

  function origin() { return { x: ORIGIN_MARGIN_L, y: H / 2 }; }

  function project(x_screen, eVal_norm, bVal_norm) {
    const o = origin();
    const zContribY = -bVal_norm;
    const yContribX = eVal_norm * Y_AXIS_DIRX;
    const yContribY = eVal_norm * -Y_AXIS_DIRY;
    return {
      x: o.x + x_screen + yContribX,
      y: o.y + zContribY + yContribY,
    };
  }

  function dibujarEjes(axisLen) {
    const o = origin();
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(o.x - 14, o.y);
    ctx.lineTo(o.x + axisLen, o.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('x (propagación)', o.x + axisLen - 90, o.y - 8);

    ctx.strokeStyle = 'rgba(255,77,77,0.25)';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + 90);
    ctx.lineTo(o.x, o.y - 90);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,77,77,0.5)';
    ctx.fillText('z (E)', o.x + 4, o.y - 92);

    ctx.strokeStyle = 'rgba(77,163,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(o.x - 70 * Y_AXIS_DIRX, o.y + 70 * Y_AXIS_DIRY);
    ctx.lineTo(o.x + 70 * Y_AXIS_DIRX, o.y - 70 * Y_AXIS_DIRY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(77,163,255,0.5)';
    ctx.fillText('y (B)', o.x + 70 * Y_AXIS_DIRX + 4, o.y - 70 * Y_AXIS_DIRY);
    ctx.restore();
  }

  function dibujarCurvas(axisLen, ampPx, k, phaseT) {
    const NPTS = 220;
    ctx.save();
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= NPTS; i++) {
      const xs = (i / NPTS) * axisLen;
      const eVal = Math.cos(k * xs * (10 / axisLen) - phaseT);
      const p = project(xs, 0, eVal * ampPx / 60);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#4da3ff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= NPTS; i++) {
      const xs = (i / NPTS) * axisLen;
      const bVal = Math.cos(k * xs * (10 / axisLen) - phaseT);
      const p = project(xs, bVal * ampPx / 60, 0);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function wavDrawArrow(x1, y1, x2, y2, color, lw) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, 3);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function dibujarVectoresDiscretos(axisLen, ampPx, k, phaseT) {
    const N_VEC = 14;
    for (let i = 1; i < N_VEC; i++) {
      const xs = (i / N_VEC) * axisLen;
      const phaseVal = k * xs * (10 / axisLen) - phaseT;
      const eVal = Math.cos(phaseVal);
      const bVal = Math.cos(phaseVal);
      const base = project(xs, 0, 0);

      const tipE = project(xs, 0, eVal * ampPx / 60);
      wavDrawArrow(base.x, base.y, tipE.x, tipE.y, 'rgba(255,77,77,0.85)', 1.6);

      const tipB = project(xs, bVal * ampPx / 60, 0);
      wavDrawArrow(base.x, base.y, tipB.x, tipB.y, 'rgba(77,163,255,0.85)', 1.6);
    }
  }

  function dibujarPoynting(axisLen) {
    const o = origin();
    const baseX = o.x + axisLen;
    const baseY = o.y;
    ctx.save();
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 14;
    wavDrawArrow(baseX, baseY, baseX + 46, baseY, '#ffd23f', 3.2);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('S', baseX + 50, baseY + 4);
    ctx.restore();
  }

  function wavRender() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const { k, E0 } = wavPhysics();
    const axisLen = Math.max(60, W - ORIGIN_MARGIN_L - ORIGIN_MARGIN_R);
    const ampPx   = 70 + (E0 - 20) * 0.6;

    dibujarEjes(axisLen);
    dibujarCurvas(axisLen, ampPx, k, wavState.phase);
    dibujarVectoresDiscretos(axisLen, ampPx, k, wavState.phase);
    dibujarPoynting(axisLen);
    wavUpdateMetrics();
  }

  function wavUpdateMetrics() {
    const { lambda, k, omega, E0, B0 } = wavPhysics();
    const elL = document.getElementById('metWavLambda');
    const elK = document.getElementById('metWavK');
    const elO = document.getElementById('metWavOmega');
    const eqB = document.getElementById('wavEqBox');

    if (elL) elL.textContent = fmt(lambda, 2);
    if (elK) elK.textContent = fmt(k, 3);
    if (elO) elO.textContent = fmt(omega, 3);

    if (eqB) {
      eqB.innerHTML = `
        <strong>Ecuaciones de onda acopladas (Maxwell, vacío):</strong><br>
        <code><span class="e-color">E_z(x,t)</span> = ${fmt(E0, 1)} · cos(${fmt(k, 3)}x − ${fmt(omega, 3)}t) k̂ &nbsp;[V/m]</code><br>
        <code><span class="b-color">B_y(x,t)</span> = ${fmt(B0, 3)} · cos(${fmt(k, 3)}x − ${fmt(omega, 3)}t) ĵ &nbsp;[×10⁻⁸ T]</code><br>
        E y B oscilan exactamente en fase, en planos mutuamente perpendiculares,
        y ambos son transversales a la dirección de propagación x̂.
        Su producto cruz vectorial <code>Ē × B̄</code> define el vector de Poynting <strong>S</strong>.
      `;
    }
  }

  function wavBindSliders() {
    const slFreq = document.getElementById('slWavFreq');
    const slAmp  = document.getElementById('slWavAmp');

    if (slFreq) {
      slFreq.addEventListener('input', () => {
        wavState.f_Hz = parseFloat(slFreq.value);
        document.getElementById('valWavFreq').textContent = wavState.f_Hz.toFixed(2);
      });
    }
    if (slAmp) {
      slAmp.addEventListener('input', () => {
        wavState.E0 = parseFloat(slAmp.value);
        document.getElementById('valWavAmp').textContent = wavState.E0.toFixed(0);
      });
    }
  }

  function wavBindToolbar() {
    const btnPause = document.getElementById('wavBtnPause');
    const btnReset = document.getElementById('wavBtnReset');

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        wavState.paused = !wavState.paused;
        btnPause.textContent = wavState.paused ? '▶ Reanudar Animación' : '⏸ Pausar Animación';
        btnPause.classList.toggle('pausing', wavState.paused);
        if (!wavState.paused) wavEnsureLoop();
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        wavState.phase = 0;
        if (wavState.paused) wavRender();
      });
    }
  }

  let wavRafId = null;
  let wavLastTs = null;

  function wavLoop(ts) {
    const dt = wavLastTs !== null ? Math.min((ts - wavLastTs) / 1000, 0.05) : 0;
    wavLastTs = ts;

    if (!wavState.paused) {
      const omega = 2 * Math.PI * wavState.f_Hz;
      wavState.phase += omega * dt;
    }
    wavRender();

    if (!wavState.paused) {
      wavRafId = requestAnimationFrame(wavLoop);
    } else {
      wavRafId = null;
      wavLastTs = null;
    }
  }

  function wavEnsureLoop() {
    if (wavRafId === null) {
      wavLastTs = null;
      wavRafId = requestAnimationFrame(wavLoop);
    }
  }

  // Expuesto para que showSection() pueda re-dimensionar y re-renderizar
  // cuando esta pestaña se hace visible, y reanudar el loop si no está pausado.
  window.wavResizeAndRender = function () {
    wavResizeCanvas();
    wavRender();
    if (!wavState.paused) wavEnsureLoop();
  };

  // Función centralizada de arranque seguro
  function setupSimulation() {
    cv  = document.getElementById('cvWaves');
    if (!cv) return;
    ctx = cv.getContext('2d');

    window.addEventListener('resize', () => {
      wavResizeCanvas();
      wavRender();
    });

    wavResizeCanvas();
    wavBindSliders();
    wavBindToolbar();
    wavRender();
    wavEnsureLoop();
  }

  // Escucha activa al DOM para prevenir ejecuciones prematuras
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSimulation);
  } else {
    setupSimulation();
  }

})();

/* ═══════════════════════════════════════════════════════════════
   LÓGICA INTERNA DE NAVEGACIÓN GENERAL
═══════════════════════════════════════════════════════════════ */
function showSection(sectionId, button){
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    button.classList.add('active');

    // Cada simulación se re-dimensiona y re-renderiza SOLO cuando su sección
    // se hace visible. Esto es necesario porque al estar oculta con
    // display:none, el canvas no puede medir su ancho real (clientWidth = 0).
    if (sectionId === 'corriente') {
        resizeCorriente();
        actualizarCorrienteTodo();
    } else if (sectionId === 'gauss') {
        resizeGauss();
        renderGauss();
    } else if (sectionId === 'campo-mag') {
        if (typeof window.magResizeAndRender === 'function') window.magResizeAndRender();
    } else if (sectionId === 'induccion') {
        if (typeof window.indResizeAndRender === 'function') window.indResizeAndRender();
    } else if (sectionId === 'ondas') {
        if (typeof window.wavResizeAndRender === 'function') window.wavResizeAndRender();
    }
}

/* ═══════════════════════════════════════════════════════════════
   LÓGICA INTERNA: SIMULACIÓN LEY DE GAUSS
═══════════════════════════════════════════════════════════════ */
const EPS0 = 8.854e-12;
const gaussState = {
  R_cm: 10,
  rho_uC: 10,
  r_cm: 6.5,
  mode: 'cross'
};

const cvGauss = document.getElementById('cvGauss');
const ctxGauss = cvGauss.getContext('2d');
let gW = 0, gH = 360, gCx = 0, gCy = 0;

function resizeGauss() {
  const cssW = cvGauss.parentElement.clientWidth;
  if(!cssW) return;
  const dpr = window.devicePixelRatio || 1;
  cvGauss.width = Math.round(cssW * dpr);
  cvGauss.height = Math.round(360 * dpr);
  ctxGauss.setTransform(dpr, 0, 0, dpr, 0, 0);
  gW = cssW;
  gH = 360;
  gCx = gW / 2;
  gCy = gH / 2;
}

function calcGaussE_SI(r_m, R_m, rho) {
  if (r_m <= 0) return 0;
  if (r_m <= R_m) return (rho * r_m) / (3 * EPS0);
  return (rho * R_m * R_m * R_m) / (3 * EPS0 * r_m * r_m);
}

function calcGaussQ_SI(r_m, R_m, rho) {
  const r_eff = Math.min(r_m, R_m);
  return rho * (4 / 3) * Math.PI * r_eff * r_eff * r_eff;
}

function gaussPhysics() {
  const R_m = gaussState.R_cm * 1e-2;
  const r_m = gaussState.r_cm * 1e-2;
  const rho = gaussState.rho_uC * 1e-6;
  return {
    E_NC: calcGaussE_SI(r_m, R_m, rho),
    Q_pC: calcGaussQ_SI(r_m, R_m, rho) * 1e12
  };
}

function getGaussPxPerCm() {
  return (Math.min(gW, gH) * 0.38) / gaussState.R_cm;
}

function drawGaussArrow(x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  if (Math.hypot(dx, dy) < 3) return;
  ctxGauss.save();
  ctxGauss.strokeStyle = color;
  ctxGauss.lineWidth = 1.5;
  ctxGauss.beginPath();
  ctxGauss.moveTo(x1, y1);
  ctxGauss.lineTo(x2, y2);
  ctxGauss.stroke();
  const angle = Math.atan2(dy, dx);
  ctxGauss.fillStyle = color;
  ctxGauss.translate(x2, y2);
  ctxGauss.rotate(angle);
  ctxGauss.beginPath();
  ctxGauss.moveTo(0, 0);
  ctxGauss.lineTo(-7, 3);
  ctxGauss.lineTo(-7, -3);
  ctxGauss.closePath();
  ctxGauss.fill();
  ctxGauss.restore();
}

function drawGaussCross() {
  ctxGauss.clearRect(0, 0, gW, gH);
  const ppc = getGaussPxPerCm();
  const R_px = gaussState.R_cm * ppc;
  const r_px = gaussState.r_cm * ppc;

  // Esfera
  ctxGauss.save();
  ctxGauss.beginPath();
  ctxGauss.arc(gCx, gCy, R_px, 0, Math.PI * 2);
  ctxGauss.fillStyle = 'rgba(55,138,221,0.12)';
  ctxGauss.fill();
  ctxGauss.strokeStyle = '#378ADD';
  ctxGauss.lineWidth = 2;
  ctxGauss.stroke();
  ctxGauss.restore();

  // Vectores
  const E_at_R = calcGaussE_SI(gaussState.R_cm * 1e-2, gaussState.R_cm * 1e-2, gaussState.rho_uC * 1e-6);
  const rays = 8, radii = [gaussState.R_cm*0.25, gaussState.R_cm*0.55, gaussState.R_cm*0.85, gaussState.R_cm*1.15, gaussState.R_cm*1.55, gaussState.R_cm*2.05];

  for(let i=0; i<rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    for(const rc of radii) {
      const x0 = gCx + Math.cos(angle) * rc * ppc;
      const y0 = gCy + Math.sin(angle) * rc * ppc;
      if (x0 < 4 || x0 > gW - 4 || y0 < 4 || y0 > gH - 4) continue;
      const E_local = calcGaussE_SI(rc * 1e-2, gaussState.R_cm * 1e-2, gaussState.rho_uC * 1e-6);
      const ratio = E_at_R > 0 ? E_local / E_at_R : 0;
      const arrowL = Math.max(4, ratio * 18);
      const alpha = Math.max(0.15, Math.min(0.9, 0.2 + ratio * 0.8));
      drawGaussArrow(x0, y0, x0 + Math.cos(angle)*arrowL, y0 + Math.sin(angle)*arrowL, `rgba(29,158,117,${alpha})`);
    }
  }

  // Superficie Gaussiana
  ctxGauss.save();
  ctxGauss.beginPath();
  ctxGauss.arc(gCx, gCy, r_px, 0, Math.PI * 2);
  ctxGauss.strokeStyle = '#D85A30';
  ctxGauss.lineWidth = 1.8;
  ctxGauss.setLineDash([6, 4]);
  ctxGauss.stroke();
  ctxGauss.restore();

  // Línea radial
  ctxGauss.save();
  ctxGauss.beginPath();
  ctxGauss.moveTo(gCx, gCy);
  ctxGauss.lineTo(gCx + r_px, gCy);
  ctxGauss.strokeStyle = 'rgba(186,117,23,0.45)';
  ctxGauss.setLineDash([4, 4]);
  ctxGauss.stroke();
  ctxGauss.restore();

  // Nodo
  ctxGauss.save();
  ctxGauss.beginPath();
  ctxGauss.arc(gCx + r_px, gCy, 8, 0, Math.PI * 2);
  ctxGauss.fillStyle = '#BA7517';
  ctxGauss.fill();
  ctxGauss.strokeStyle = '#ffd070';
  ctxGauss.lineWidth = 1.5;
  ctxGauss.stroke();
  ctxGauss.restore();

  // Textos
  ctxGauss.save();
  ctxGauss.font = '12px system-ui, sans-serif';
  ctxGauss.fillStyle = '#5fa8ff';
  ctxGauss.fillText(`R = ${gaussState.R_cm.toFixed(1)} cm`, gCx + 6, gCy - R_px - 8);
  ctxGauss.fillStyle = '#e87a50';
  ctxGauss.fillText(gaussState.r_cm <= gaussState.R_cm ? 'r (interior)' : 'r (exterior)', gCx + 4, gCy - r_px - 8);
  ctxGauss.fillStyle = '#f0c060';
  ctxGauss.fillText(`${gaussState.r_cm.toFixed(1)} cm`, gCx + r_px + 10, gCy + 4);
  ctxGauss.restore();
}

function drawGaussGraph() {
  ctxGauss.clearRect(0, 0, gW, gH);
  const pad = { l: 68, r: 24, t: 28, b: 52 };
  const graphW = gW - pad.l - pad.r;
  const graphH = gH - pad.t - pad.b;

  const R_cm = gaussState.R_cm;
  const maxR_cm = R_cm * 2.6;
  const E_peak = calcGaussE_SI(R_cm*1e-2, R_cm*1e-2, gaussState.rho_uC*1e-6);
  const maxE = E_peak * 1.22;

  const xOf = (r) => pad.l + (r / maxR_cm) * graphW;
  const yOf = (E) => pad.t + graphH - Math.min(1, E / maxE) * graphH;

  ctxGauss.fillStyle = 'rgba(55,138,221,0.06)';
  ctxGauss.fillRect(pad.l, pad.t, xOf(R_cm) - pad.l, graphH);

  // Eje Y ticks
  ctxGauss.save();
  ctxGauss.font = '11px system-ui, sans-serif';
  ctxGauss.fillStyle = '#666';
  ctxGauss.textAlign = 'right';
  for(let i=0; i<=5; i++) {
    const y = pad.t + (i/5)*graphH;
    ctxGauss.strokeStyle = 'rgba(255,255,255,0.07)';
    ctxGauss.beginPath(); ctxGauss.moveTo(pad.l, y); ctxGauss.lineTo(pad.l + graphW, y); ctxGauss.stroke();
    ctxGauss.fillText((maxE*(1-(i/5))).toFixed(0), pad.l - 6, y + 4);
  }
  ctxGauss.restore();

  // Curva
  ctxGauss.save();
  ctxGauss.strokeStyle = '#1D9E75';
  ctxGauss.lineWidth = 2.5;
  ctxGauss.beginPath();
  for(let i=1; i<=300; i++) {
    const r = (i/300)*maxR_cm;
    const E = calcGaussE_SI(r*1e-2, R_cm*1e-2, gaussState.rho_uC*1e-6);
    i===1 ? ctxGauss.moveTo(xOf(r), yOf(E)) : ctxGauss.lineTo(xOf(r), yOf(E));
  }
  ctxGauss.stroke();
  ctxGauss.restore();

  // Medición actual
  const rx = xOf(gaussState.r_cm);
  const ry = yOf(calcGaussE_SI(gaussState.r_cm*1e-2, R_cm*1e-2, gaussState.rho_uC*1e-6));
  ctxGauss.save();
  ctxGauss.strokeStyle = 'rgba(186,117,23,0.45)';
  ctxGauss.setLineDash([4, 3]);
  ctxGauss.beginPath();
  ctxGauss.moveTo(rx, pad.t+graphH); ctxGauss.lineTo(rx, ry);
  ctxGauss.moveTo(pad.l, ry); ctxGauss.lineTo(rx, ry);
  ctxGauss.stroke();
  ctxGauss.beginPath(); ctxGauss.arc(rx, ry, 5, 0, Math.PI*2);
  ctxGauss.fillStyle = '#BA7517'; ctxGauss.fill();
  ctxGauss.strokeStyle = '#ffd070'; ctxGauss.stroke();
  ctxGauss.restore();

  // Línea R
  ctxGauss.save();
  ctxGauss.strokeStyle = 'rgba(213,90,48,0.65)';
  ctxGauss.setLineDash([5, 3]);
  ctxGauss.beginPath(); ctxGauss.moveTo(xOf(R_cm), pad.t); ctxGauss.lineTo(xOf(R_cm), pad.t+graphH); ctxGauss.stroke();
  ctxGauss.fillStyle = '#D85A30'; ctxGauss.font = '11px system-ui, sans-serif'; ctxGauss.textAlign = 'center';
  ctxGauss.fillText('R', xOf(R_cm), pad.t + graphH + 14);
  ctxGauss.restore();

  // Ejes finales
  ctxGauss.strokeStyle = '#555';
  ctxGauss.beginPath(); ctxGauss.moveTo(pad.l, pad.t); ctxGauss.lineTo(pad.l, pad.t+graphH); ctxGauss.lineTo(pad.l+graphW, pad.t+graphH); ctxGauss.stroke();

  ctxGauss.save();
  ctxGauss.fillStyle = '#777'; ctxGauss.font = '11px system-ui, sans-serif'; ctxGauss.textAlign = 'center';
  for(let i=0; i<=6; i++) {
    const r = (i/6)*maxR_cm;
    ctxGauss.fillText(r.toFixed(1), xOf(r), pad.t + graphH + 16);
  }
  ctxGauss.fillText('r (cm)', pad.l + graphW/2, gH - 6);
  ctxGauss.translate(12, pad.t + graphH/2); ctxGauss.rotate(-Math.PI/2);
  ctxGauss.fillText('E (N/C)', 0, 0);
  ctxGauss.restore();
}

function updateGaussMetrics() {
  const { E_NC, Q_pC } = gaussPhysics();
  let Qstr, Qunit;
  if (Math.abs(Q_pC) >= 1e6) { Qstr = (Q_pC/1e6).toFixed(3); Qunit = 'μC'; }
  else if (Math.abs(Q_pC) >= 1e3) { Qstr = (Q_pC/1e3).toFixed(3); Qunit = 'nC'; }
  else { Qstr = Q_pC.toFixed(3); Qunit = 'pC'; }

  document.getElementById('metGaussR').textContent = gaussState.r_cm.toFixed(2);
  document.getElementById('metGaussQ').textContent = Qstr;
  document.getElementById('metGaussQunit').textContent = Qunit;
  document.getElementById('metGaussE').textContent = E_NC.toFixed(2);

  const box = document.getElementById('eqGaussBox');
  if(gaussState.r_cm <= gaussState.R_cm) {
    box.innerHTML = `<span class="eq-zone-tag interior">r ≤ R — Zona Interior</span><br>
                     <strong>Carga encerrada:</strong> <code>Q<sub>enc</sub> = ρ · (4/3)π r³</code><br>
                     <strong>Campo eléctrico:</strong> <code>E = (ρ · r) / (3 ε₀)</code> &nbsp;→&nbsp; E crece linealmente con r`;
  } else {
    box.innerHTML = `<span class="eq-zone-tag exterior">r > R — Zona Exterior</span><br>
                     <strong>Carga encerrada:</strong> <code>Q<sub>enc</sub> = Q<sub>total</sub> = ρ · (4/3)π R³</code> (constante)<br>
                     <strong>Campo eléctrico:</strong> <code>E = (ρ · R³) / (3 ε₀ · r²)</code> &nbsp;→&nbsp; E decae como 1/r²`;
  }
}

function renderGauss() {
  if (gaussState.mode === 'cross') drawGaussCross();
  else drawGaussGraph();
  updateGaussMetrics();
}

function bindGaussEvents() {
  document.getElementById('sliderR').addEventListener('input', function() {
    gaussState.R_cm = parseFloat(this.value);
    document.getElementById('valR').textContent = gaussState.R_cm.toFixed(1);
    if(gaussState.r_cm > gaussState.R_cm * 2.5) gaussState.r_cm = gaussState.R_cm * 2.5;
    renderGauss();
  });
  document.getElementById('sliderRho').addEventListener('input', function() {
    gaussState.rho_uC = parseFloat(this.value);
    document.getElementById('valRho').textContent = gaussState.rho_uC.toFixed(0);
    renderGauss();
  });
  document.querySelectorAll('#gaussModeGroup .mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#gaussModeGroup .mode-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      gaussState.mode = this.dataset.mode;
      cvGauss.classList.toggle('draggable', gaussState.mode === 'cross');
      renderGauss();
    });
  });

  let drag = false;
  const getX = (cx) => cx - cvGauss.getBoundingClientRect().left;
  const apply = (cx) => {
    if(gaussState.mode !== 'cross') return;
    const r = Math.abs(getX(cx) - gCx) / getGaussPxPerCm();
    gaussState.r_cm = Math.max(0.05, Math.min(gaussState.R_cm*2.45, r));
    renderGauss();
  };
  const near = (cx, cy) => {
    if(gaussState.mode !== 'cross') return false;
    const lx = getX(cx), ly = cy - cvGauss.getBoundingClientRect().top;
    return Math.hypot(lx - (gCx + gaussState.r_cm*getGaussPxPerCm()), ly - gCy) < 18;
  };

  cvGauss.addEventListener('mousedown', e => { if(near(e.clientX, e.clientY)){ drag=true; cvGauss.style.cursor='grabbing'; e.preventDefault(); } });
  window.addEventListener('mousemove', e => { if(drag) apply(e.clientX); });
  window.addEventListener('mouseup', () => { if(drag){ drag=false; cvGauss.style.cursor=''; } });
  cvGauss.addEventListener('mousemove', e => { if(!drag) cvGauss.style.cursor = near(e.clientX, e.clientY) ? 'ew-resize' : ''; });

  cvGauss.addEventListener('touchstart', e => { const t = e.touches[0]; if(near(t.clientX, t.clientY)){ drag=true; e.preventDefault(); } }, {passive:false});
  cvGauss.addEventListener('touchmove', e => { if(drag){ e.preventDefault(); apply(e.touches[0].clientX); } }, {passive:false});
  cvGauss.addEventListener('touchend', () => drag=false);
}


/* ═══════════════════════════════════════════════════════════════
   LÓGICA INTERNA: SIMULACIÓN DE CORRIENTE ELÉCTRICA
═══════════════════════════════════════════════════════════════ */
const MATERIALES = {
  cu: { nombre: 'Cobre',    rho: 1.68e-8, n: 8.49e28, color: '#b0713a' },
  al: { nombre: 'Aluminio', rho: 2.82e-8, n: 1.81e29, color: '#8a9094' },
  ni: { nombre: 'Nicromio', rho: 1.10e-6, n: 9.0e28,  color: '#543838' },
};
const Q_ELECTRON = 1.602176634e-19;

const corrState = { mat: 'cu', V: 6.0, L_cm: 50, r_mm: 1.5 };
let corrPhys = { R: 0, I: 0, A_m2: 0, vd_ms: 0 };

const cvCorr = document.getElementById('cvCorriente');
const ctxCorr = cvCorr.getContext('2d');
let cW = 0, cH = 260;

function resizeCorriente() {
  const cssW = cvCorr.parentElement.clientWidth;
  if(!cssW) return;
  const dpr = window.devicePixelRatio || 1;
  cvCorr.width = Math.round(cssW * dpr);
  cvCorr.height = Math.round(cH * dpr);
  ctxCorr.setTransform(dpr, 0, 0, dpr, 0, 0);
  cW = cssW;
}

function calcularCorrienteFisica() {
  const m = MATERIALES[corrState.mat];
  const L_m = corrState.L_cm * 1e-2;
  const r_m = corrState.r_mm * 1e-3;
  const A_m2 = Math.PI * r_m * r_m;
  const R = m.rho * L_m / A_m2;
  const I = corrState.V / R;
  corrPhys = { R, I, A_m2, vd_ms: I / (m.n * Q_ELECTRON * A_m2) };
}

function formatSI(val, unit) {
  if (val >= 1e6)  return [(val / 1e6).toFixed(2), 'M' + unit];
  if (val >= 1e3)  return [(val / 1e3).toFixed(2), 'k' + unit];
  if (val >= 1)    return [val.toFixed(4),          unit      ];
  if (val >= 1e-3) return [(val * 1e3).toFixed(3),  'm' + unit];
  if (val >= 1e-6) return [(val * 1e6).toFixed(3),  'μ' + unit];
  return [(val * 1e9).toFixed(3), 'n' + unit];
}

function actualizarCorrienteMetricas() {
  const [Rstr, Runit] = formatSI(corrPhys.R, 'Ω');
  document.getElementById('metR').textContent = Rstr;
  document.getElementById('metRu').textContent = Runit;

  const [Istr, Iunit] = formatSI(corrPhys.I, 'A');
  document.getElementById('metI').textContent = Istr;
  document.getElementById('metIu').textContent = Iunit;

  document.getElementById('metA').textContent = (corrPhys.A_m2 * 1e6).toFixed(4);

  const [Vdstr, Vdunit] = formatSI(corrPhys.vd_ms, 'm/s');
  document.getElementById('metVd').textContent = Vdstr;
  document.getElementById('metVdu').textContent = Vdunit;

  document.getElementById('eqBox').innerHTML = `
    <strong>Resistencia geométrica:</strong><br>
    <code>R = ρ · L / A</code> = (${MATERIALES[corrState.mat].rho.toExponential(2)} Ω·m) · (${(corrState.L_cm/100).toFixed(2)} m) / (${corrPhys.A_m2.toExponential(2)} m²) = <b>${Rstr} ${Runit}</b><br><br>
    <strong>Ley de Ohm Macroscópica:</strong><br>
    <code>I = V / R</code> = ${corrState.V.toFixed(1)} V / ${Rstr} ${Runit} = <b>${Istr} ${Iunit}</b><br><br>
    <strong>Modelo Microscópico:</strong><br>
    <code>v_d = I / (n·q·A)</code> = <b>${corrPhys.vd_ms.toExponential(3)} m/s</b>
  `;
}

// Partículas
let particulas = [];
function initParticulas() {
  particulas = [];
  for(let i=0; i<55; i++) particulas.push({ x: Math.random(), y: Math.random(), r: 2.8 + Math.random()*1.2 });
}

function drawCorrienteCable() {
  if (cW <= 0) return;
  ctxCorr.clearRect(0, 0, cW, cH);
  const m = MATERIALES[corrState.mat];
  const w = cW * (0.20 + ((corrState.L_cm-10)/90)*0.62);
  const h = 12 + ((corrState.r_mm-0.5)/2.5)*55;
  const x0 = cW/2 - w/2, y0 = cH/2 - h/2;

  ctxCorr.fillStyle = m.color;
  ctxCorr.fillRect(x0, y0, w, h);

  // Terminales
  ctxCorr.fillStyle = '#ff6b6b'; ctxCorr.fillRect(x0 - 7, y0, 14, h);
  ctxCorr.fillStyle = '#4a9eff'; ctxCorr.fillRect(x0 + w - 7, y0, 14, h);

  // Electrones
  for(const p of particulas) {
    const px = x0 + p.x * w, py = y0 + p.y * h;
    ctxCorr.save();
    ctxCorr.beginPath(); ctxCorr.arc(px, py, p.r, 0, Math.PI*2);
    ctxCorr.fillStyle = '#00f0ff'; ctxCorr.shadowBlur = 8; ctxCorr.shadowColor = '#00f0ff'; ctxCorr.fill();
    ctxCorr.restore();
  }

  // Campo E
  ctxCorr.save();
  ctxCorr.strokeStyle = '#ffaa44'; ctxCorr.lineWidth = 1.5;
  ctxCorr.beginPath(); ctxCorr.moveTo(x0 + w - 10, y0 + h + 16); ctxCorr.lineTo(x0 + 10, y0 + h + 16); ctxCorr.stroke();
  ctxCorr.fillStyle = '#ffaa44'; ctxCorr.font = 'italic bold 11px sans-serif';
  ctxCorr.fillText('E', cW/2, y0 + h + 12);
  ctxCorr.restore();
}

function updateCorrienteParticulas(dt) {
  if (cW <= 0 || corrPhys.vd_ms <= 0) return;
  const logVal = Math.log10(corrPhys.vd_ms);
  const frac = Math.max(0, Math.min(1, (logVal - (-6)) / (-2 - (-6))));
  const vel = 35 + frac * 265;
  const dx = vel * dt / cW;
  for(const p of particulas) {
    p.x -= dx;
    if(p.x < 0) { p.x += 1; p.y = Math.random(); }
  }
}

function actualizarCorrienteTodo() {
  calcularCorrienteFisica();
  actualizarCorrienteMetricas();
}

function bindCorrienteEvents() {
  document.getElementById('slV').addEventListener('input', function() {
    corrState.V = parseFloat(this.value);
    document.getElementById('valV').textContent = corrState.V.toFixed(1);
    actualizarCorrienteTodo();
  });
  document.getElementById('slL').addEventListener('input', function() {
    corrState.L_cm = parseFloat(this.value);
    document.getElementById('valL').textContent = corrState.L_cm.toFixed(0);
    actualizarCorrienteTodo();
  });
  document.getElementById('slRCorr').addEventListener('input', function() {
    corrState.r_mm = parseFloat(this.value);
    document.getElementById('valRCorr').textContent = corrState.r_mm.toFixed(1);
    actualizarCorrienteTodo();
  });
  document.querySelectorAll('#matGroup .mat-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#matGroup .mat-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      corrState.mat = this.dataset.mat;
      actualizarCorrienteTodo();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   LOOP CENTRAL DE ANIMACIÓN DE PARTICULAS
═══════════════════════════════════════════════════════════════ */
let lastTs = null;
function masterLoop(ts) {
  const dt = lastTs !== null ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
  lastTs = ts;

  // Solo actualiza y dibuja si la pestaña activa es corriente
  if(document.getElementById('corriente').classList.contains('active')) {
    updateCorrienteParticulas(dt);
    drawCorrienteCable();
  }
  requestAnimationFrame(masterLoop);
}

/* ═══════════════════════════════════════════════════════════════
   INICIALIZACIÓN GLOBAL AUTOMÁTICA
═══════════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  resizeGauss(); renderGauss();
  resizeCorriente(); actualizarCorrienteTodo();
});

// Arrancar sistemas al cargar
requestAnimationFrame(() => {
  resizeGauss();
  gaussState.r_cm = gaussState.R_cm * 0.65;
  bindGaussEvents();
  renderGauss();

  resizeCorriente();
  initParticulas();
  bindCorrienteEvents();
  actualizarCorrienteTodo();

  requestAnimationFrame(masterLoop);
});
