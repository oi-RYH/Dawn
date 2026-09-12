// Mirrors the stage animation's 6s cycle so the numeric readout tracks the
// visual tilt instead of just looping independently.
(function () {
  const el = document.getElementById('angle-value');
  if (!el) return;

  const period = 6000;
  const min = 18;
  const max = 92;

  function frame(t) {
    const phase = (t % period) / period; // 0..1
    const wave = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0..1..0, matches ease pattern
    const angle = Math.round(max - wave * (max - min));
    el.textContent = angle + '°';
    requestAnimationFrame(frame);
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(frame);
  }
})();
