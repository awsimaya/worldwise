// ─── World Map Renderer ───
const MapRenderer = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let svg, tooltip;
  let scale = 1, panX = 0, panY = 0;
  let isPanning = false, panStart = { x: 0, y: 0 };
  let onCountryClick = null;
  let onCountryHover = null;

  function continentColor(continent) {
    return (CONTINENTS[continent] || { color: '#CBD5E1' }).color;
  }
  function continentColorLight(continent) {
    return (CONTINENTS[continent] || { light: '#E2E8F0' }).light;
  }

  function buildSVG() {
    svg = document.getElementById('world-svg');
    tooltip = document.getElementById('map-tooltip');

    // Ocean background already set via CSS on #map-pane
    // Draw country paths
    const g = document.createElementNS(SVG_NS, 'g');
    g.id = 'countries-group';
    svg.appendChild(g);

    for (const [numId, pathD] of Object.entries(WORLD_PATHS)) {
      const country = COUNTRIES[numId];
      if (!country) continue; // skip unmapped (antarctica, etc.)

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('id', 'cp-' + numId);
      path.setAttribute('data-id', numId);
      path.classList.add('country-path');

      const mastery = Progress.getMastery(numId);
      const baseColor = continentColor(country.continent);
      path.setAttribute('fill', mastery >= 3 ? continentColorLight(country.continent) : baseColor);

      path.addEventListener('mouseenter', e => handleHover(e, numId, path));
      path.addEventListener('mouseleave', () => hideTooltip());
      path.addEventListener('click', () => handleClick(numId, path));

      g.appendChild(path);
    }

    // Zoom & pan
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('mousedown', onPanStart);
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanEnd);

    applyTransform();
  }

  // Convert screen pixel coords → SVG viewBox coords (handles viewBox scaling correctly)
  function clientToSVG(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function applyTransform() {
    const g = svg.querySelector('#countries-group');
    if (g) g.setAttribute('transform', `translate(${panX},${panY}) scale(${scale})`);
  }

  function onWheel(e) {
    e.preventDefault();
    const { x: mx, y: my } = clientToSVG(e.clientX, e.clientY);
    const delta = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(12, Math.max(1, scale * delta));
    const ratio = newScale / scale;
    panX = mx - ratio * (mx - panX);
    panY = my - ratio * (my - panY);
    clampPan(newScale);
    scale = newScale;
    applyTransform();
  }

  function onPanStart(e) {
    if (e.button !== 0) return;
    isPanning = true;
    const { x, y } = clientToSVG(e.clientX, e.clientY);
    panStart = { x: x - panX, y: y - panY };
    svg.style.cursor = 'grabbing';
  }
  function onPanMove(e) {
    if (!isPanning) return;
    const { x, y } = clientToSVG(e.clientX, e.clientY);
    panX = x - panStart.x;
    panY = y - panStart.y;
    clampPan(scale);
    applyTransform();
  }
  function onPanEnd() {
    isPanning = false;
    svg.style.cursor = 'default';
  }

  // All values in SVG viewBox units (0–1000 × 0–500)
  function clampPan(s) {
    const mapW = 1000 * s, mapH = 500 * s;
    const vw = 1000, vh = 500; // viewBox dimensions
    panX = Math.min(0, Math.max(panX, vw - mapW));
    panY = Math.min(0, Math.max(panY, vh - mapH));
    if (mapW < vw) panX = (vw - mapW) / 2;
    if (mapH < vh) panY = (vh - mapH) / 2;
  }

  function handleHover(e, numId, path) {
    const country = COUNTRIES[numId];
    if (!country) return;
    const rect = svg.getBoundingClientRect();
    tooltip.textContent = country.flag + ' ' + country.name;
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    tooltip.classList.add('visible');
    if (onCountryHover) onCountryHover(numId, country);
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  function handleClick(numId, path) {
    if (onCountryClick) onCountryClick(numId, COUNTRIES[numId]);
  }

  function setClickHandler(fn) { onCountryClick = fn; }
  function setHoverHandler(fn) { onCountryHover = fn; }

  function highlightCountry(numId, type) {
    // type: 'selected' | 'correct' | 'wrong' | 'target' | 'dimmed' | null
    const path = document.getElementById('cp-' + numId);
    if (!path) return;
    path.classList.remove('selected','highlight-correct','highlight-wrong','highlight-target','dimmed');
    if (type) path.classList.add(type === 'correct' ? 'highlight-correct' :
                                  type === 'wrong'   ? 'highlight-wrong'   :
                                  type === 'target'  ? 'highlight-target'  :
                                  type === 'dimmed'  ? 'dimmed'            : 'selected');
  }

  function clearAllHighlights() {
    document.querySelectorAll('.country-path').forEach(p => {
      p.classList.remove('selected','highlight-correct','highlight-wrong','highlight-target','dimmed');
    });
  }

  function dimAllExcept(ids) {
    document.querySelectorAll('.country-path').forEach(p => {
      const id = p.getAttribute('data-id');
      p.classList.toggle('dimmed', !ids.includes(id));
    });
  }

  function updateMasteryColors() {
    for (const [numId, country] of Object.entries(COUNTRIES)) {
      const path = document.getElementById('cp-' + numId);
      if (!path) continue;
      const mastery = Progress.getMastery(numId);
      const base = continentColor(country.continent);
      const light = continentColorLight(country.continent);
      path.setAttribute('fill', mastery >= 3 ? light : base);
    }
  }

  function zoomIn()  { scale = Math.min(12, scale * 1.3); clampPan(scale); applyTransform(); }
  function zoomOut() { scale = Math.max(1,  scale * 0.77); clampPan(scale); applyTransform(); }
  function resetView() { scale = 1; panX = 0; panY = 0; applyTransform(); }

  function panToCountry(numId) {
    const path = document.getElementById('cp-' + numId);
    if (!path) return;
    const bbox = path.getBBox();
    const targetScale = Math.max(scale, 3);
    const cx = bbox.x + bbox.width  / 2;
    const cy = bbox.y + bbox.height / 2;
    // Center the country in the viewBox (500×250 is the viewBox center)
    panX = 500 - cx * targetScale;
    panY = 250 - cy * targetScale;
    scale = targetScale;
    clampPan(scale);
    applyTransform();
  }

  return { buildSVG, setClickHandler, setHoverHandler, highlightCountry, clearAllHighlights, dimAllExcept, updateMasteryColors, zoomIn, zoomOut, resetView, panToCountry };
})();
