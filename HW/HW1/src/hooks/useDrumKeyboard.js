import { useEffect, useState } from 'react';

/**
 * @param {Map<string, import('../data/drumPads.js').DrumPad>} padMap
 * @param {(id: string) => void | Promise<void>} onTriggerPad
 * @param {boolean} isEnabled
 * @returns {Set<string>} IDs held by physical keyboard shortcuts.
 */
export function useDrumKeyboard(padMap, onTriggerPad, isEnabled = true) {
  const [activePadIds, setActivePadIds] = useState(() => new Set());

  useEffect(() => {
    if (!isEnabled) return;
    const heldCodes = new Set();
    let isComposing = false;

    function syncActivePads() {
      setActivePadIds(new Set([...heldCodes].map((code) => padMap.get(code).id)));
    }

    function releaseAll() {
      isComposing = false;
      if (heldCodes.size === 0) return;
      heldCodes.clear();
      syncActivePads();
    }

    function isEditable(event) {
      const path = event.composedPath?.() ?? [event.target];
      return path.some((element) =>
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable,
      );
    }

    function onKeyDown(event) {
      if (event.repeat) return;
      if (event.defaultPrevented || event.isComposing || isComposing || isEditable(event)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const pad = padMap.get(event.code);
      if (!pad || heldCodes.has(event.code)) return;
      event.preventDefault();
      heldCodes.add(event.code);
      syncActivePads();
      // Shared callback handles audio failures; the hook owns only key state.
      void onTriggerPad(pad.id);
    }

    function onKeyUp(event) {
      // Release even if focus moved into an editor or composition has started.
      if (heldCodes.delete(event.code)) syncActivePads();
    }

    function onCompositionStart() {
      releaseAll();
      isComposing = true;
    }

    function onCompositionEnd() { isComposing = false; }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') releaseAll();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('compositionstart', onCompositionStart);
    window.addEventListener('compositionend', onCompositionEnd);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('compositionstart', onCompositionStart);
      window.removeEventListener('compositionend', onCompositionEnd);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseAll();
    };
  }, [padMap, onTriggerPad, isEnabled]);

  return activePadIds;
}
