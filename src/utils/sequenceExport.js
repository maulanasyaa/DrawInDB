import { toPng } from 'html-to-image';
import { resolveSvgCssVars } from './exportImage';

/**
 * Export PNG untuk kanvas SVG sequence. Tidak lewat viewport React Flow:
 * seluruh diagram (viewBox) diekspor, bukan yang terlihat di layar.
 * Highlight seleksi dan badge peringatan (`.seq-ui`) dibuang.
 */
export async function exportSequencePng({ filename = 'diagram', padding = 48, pixelRatio = 2 } = {}) {
  const source = document.querySelector('[data-sequence-canvas]');
  if (!source) throw new Error('Sequence canvas is not mounted');

  const rootStyle = getComputedStyle(document.documentElement);
  const background = rootStyle.getPropertyValue('--bg-base').trim() || '#ffffff';

  const svg = source.cloneNode(true);
  svg.querySelectorAll('.seq-ui').forEach((el) => el.remove());

  // Ukuran ekspor = ukuran alami diagram, bukan skala zoom di layar.
  const vb = source.viewBox.baseVal;
  svg.setAttribute('width', vb.width);
  svg.setAttribute('height', vb.height);
  svg.style.fontFamily = getComputedStyle(document.body).fontFamily;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:fixed;left:-99999px;top:0;padding:${padding}px;background:${background};`;
  wrapper.appendChild(svg);
  document.body.appendChild(wrapper);

  const restoreVars = resolveSvgCssVars(wrapper);
  try {
    const dataUrl = await toPng(wrapper, {
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
      pixelRatio,
      backgroundColor: background,
      skipFonts: true,
    });

    const link = document.createElement('a');
    link.download = `${filename.replace(/\s+/g, '_').toLowerCase()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    restoreVars();
    wrapper.remove();
  }
}
