import { toPng } from 'html-to-image';

export async function exportToPNG(elementId, filename) {
  try {
    const node = document.querySelector(elementId);
    if (!node) throw new Error(`Element ${elementId} not found`);

    // Temporarily hide elements
    const elementsToHide = document.querySelectorAll('.react-flow__controls, .react-flow__minimap, .react-flow__panel');
    elementsToHide.forEach(el => { el.style.display = 'none'; });

    // Wait a tick for DOM to update
    await new Promise(resolve => setTimeout(resolve, 50));

    const dataUrl = await toPng(node, {
      backgroundColor: '#0f0f0f',
      pixelRatio: 2, // High quality
      filter: (node) => {
        // Exclude handles for a cleaner look
        return !node.classList?.contains('react-flow__handle');
      }
    });

    // Restore elements
    elementsToHide.forEach(el => { el.style.display = ''; });

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    
    return true;
  } catch (err) {
    console.error('Failed to export PNG', err);
    throw err;
  }
}
