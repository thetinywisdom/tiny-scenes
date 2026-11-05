/**
 * Stats readout, toggled with D or `?debug=1`.
 * Turning debug on also enables orbit for scenes that ship with it off.
 * Turning debug off restores that scene's own orbit default.
 */
export function createDebug({ view, sceneWantsOrbit, initiallyOn, renderMode }) {
  const panel = document.createElement('div');
  panel.className = 'stats';
  panel.hidden = true;
  document.body.appendChild(panel);

  let on = initiallyOn && !renderMode;
  let last = null;

  function apply() {
    panel.hidden = !on;
    view.setEnabled(on || sceneWantsOrbit);
  }

  function report(stats = {}) {
    last = stats;
    if (!on) return;
    const { draws = 0, triangles = 0, modelTriangles, frameMs = 0 } = stats;
    const tris = modelTriangles ?? triangles;
    panel.textContent = [
      `draws ${draws}`,
      `tris ${tris}`,
      `frame ${frameMs.toFixed(1)} ms`,
      `orbit ${view.enabled ? 'on' : 'off'}`,
    ].join('\n');
  }

  function toggle() {
    on = !on;
    apply();
    if (on && last) report(last);
  }

  if (!renderMode) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        toggle();
      }
    });
  }

  apply();

  return {
    get enabled() {
      return on;
    },
    report,
  };
}
