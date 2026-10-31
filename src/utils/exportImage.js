import { getNodesBounds, getViewportForBounds } from "reactflow";
import { toPng } from "html-to-image";

/**
 * Resolve semua CSS custom properties di SVG menjadi nilai eksplisit.
 * html-to-image tidak bisa resolve var() di dalam SVG attributes.
 */
export function resolveSvgCssVars(rootEl) {
  const rootStyle = getComputedStyle(document.documentElement);

  const cssVarMap = {
    "--bg-surface": rootStyle.getPropertyValue("--bg-surface").trim(),
    "--bg-base": rootStyle.getPropertyValue("--bg-base").trim(),
    "--text-primary": rootStyle.getPropertyValue("--text-primary").trim(),
    "--border": rootStyle.getPropertyValue("--border").trim(),
    "--border-focus": rootStyle.getPropertyValue("--border-focus").trim(),
    "--warning": rootStyle.getPropertyValue("--warning").trim(),
    "--accent": rootStyle.getPropertyValue("--accent").trim(),
  };

  const tailwindMap = {
    "fill-surface": ["fill", cssVarMap["--bg-surface"]],
    "stroke-focus": ["stroke", cssVarMap["--border-focus"]],
    "stroke-theme": ["stroke", cssVarMap["--border"]],
    "stroke-warning": ["stroke", cssVarMap["--warning"]],
    "stroke-teal-500": ["stroke", "#14b8a6"],
  };

  const restoreList = [];

  const svgs = rootEl.querySelectorAll("svg");
  svgs.forEach((svg) => {
    const shapes = svg.querySelectorAll("*");
    shapes.forEach((shape) => {
      // 1. Resolve inline attribute var()
      ["fill", "stroke"].forEach((attr) => {
        const val = shape.getAttribute(attr);
        if (val && val.startsWith("var(")) {
          const match = val.match(/var\((--[^),\s]+)\)/);
          if (match && cssVarMap[match[1]]) {
            restoreList.push({ shape, attr, originalValue: val });
            shape.setAttribute(attr, cssVarMap[match[1]]);
          }
        }
      });

      // 2. Resolve Tailwind class-based fill/stroke
      const classList = shape.getAttribute("class") || "";
      Object.entries(tailwindMap).forEach(([cls, [attr, value]]) => {
        if (classList.includes(cls) && value) {
          const currentAttr = shape.getAttribute(attr);
          if (!currentAttr || currentAttr.startsWith("var(")) {
            restoreList.push({
              shape,
              attr,
              originalValue: currentAttr,
            });
            shape.setAttribute(attr, value);
          }
        }
      });

      // 3. NEW: Resolve computed style stroke/fill untuk path & line
      //    (React Flow edges pakai CSS class untuk stroke, bukan attribute)
      if (
        shape.tagName === "path" ||
        shape.tagName === "line" ||
        shape.tagName === "polyline" ||
        shape.tagName === "polygon"
      ) {
        const computed = getComputedStyle(shape);
        const computedStroke = computed.stroke;
        const computedFill = computed.fill;

        // Kalau stroke dari CSS class (bukan attribute), force inline
        if (
          !shape.getAttribute("stroke") &&
          computedStroke &&
          computedStroke !== "none"
        ) {
          restoreList.push({
            shape,
            attr: "stroke",
            originalValue: null,
          });
          shape.setAttribute("stroke", computedStroke);
        }

        // Preserve stroke-width
        if (!shape.getAttribute("stroke-width") && computed.strokeWidth) {
          restoreList.push({
            shape,
            attr: "stroke-width",
            originalValue: null,
          });
          shape.setAttribute("stroke-width", computed.strokeWidth);
        }

        // Preserve fill kalau perlu
        if (
          !shape.getAttribute("fill") &&
          computedFill &&
          computedFill !== "none" &&
          shape.tagName !== "path" // path edge biasanya fill: none
        ) {
          restoreList.push({
            shape,
            attr: "fill",
            originalValue: null,
          });
          shape.setAttribute("fill", computedFill);
        }
      }
    });
  });

  return () => {
    restoreList.forEach(({ shape, attr, originalValue }) => {
      if (originalValue === null) {
        shape.removeAttribute(attr);
      } else {
        shape.setAttribute(attr, originalValue);
      }
    });
  };
}

/** Nama file PNG dari nama diagram: spasi jadi underscore, huruf kecil. */
export function pngFileName(name) {
  return `${String(name || "diagram").replace(/\s+/g, "_").toLowerCase()}.png`;
}

/**
 * Semua node sudah punya ukuran hasil pengukuran React Flow. Array kosong
 * dianggap siap — guard "diagram kosong" ada di pemanggil.
 */
export function nodesMeasured(nodes) {
  return (nodes || []).every((n) => n.width > 0 && n.height > 0);
}

/**
 * Tunggu kanvas siap difoto: node terukur (React Flow menyembunyikan node yang
 * belum diukur dengan `visibility: hidden`, dan `getNodesBounds` membaca
 * `node.width/height` hasil ukur) serta marker panah sudah disuntik
 * (UseCaseMarkers/StateMachineMarkers memakai setTimeout 100 ms).
 * Berhenti saat siap atau timeout — tidak melempar error.
 */
async function waitUntilReady(flowEl, readNodes, timeoutMs = 1500) {
  const deadline = performance.now() + timeoutMs;

  const markersReady = () => {
    const edgesSvg = flowEl.querySelector(".react-flow__edges");
    if (!edgesSvg) return true;

    const referenced = new Set();
    edgesSvg.querySelectorAll("[marker-start], [marker-end]").forEach((el) => {
      for (const attr of ["marker-start", "marker-end"]) {
        const match = (el.getAttribute(attr) || "").match(/url\(#(.+?)\)/);
        if (match) referenced.add(match[1]);
      }
    });
    if (referenced.size === 0) return true;

    const present = new Set(
      Array.from(flowEl.querySelectorAll("[id]"), (el) => el.id),
    );
    return Array.from(referenced).every((id) => present.has(id));
  };

  while (performance.now() < deadline) {
    const hiddenNode = flowEl.querySelector(
      '.react-flow__node[style*="visibility: hidden"]',
    );
    if (!hiddenNode && nodesMeasured(readNodes()) && markersReady()) return;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/**
 * Export React Flow diagram sebagai PNG dengan konten center-aligned.
 * `nodesOrGetter` boleh array atau fungsi yang mengembalikan array — getter
 * dipakai EditorHeader supaya bounds dihitung dari node yang sudah diukur,
 * bukan snapshot render yang basi.
 */
export async function exportDiagramAsImage(nodesOrGetter, options = {}) {
  const {
    filename = "diagram",
    padding = 60,
    minWidth = 1200,
    minHeight = 800,
    pixelRatio = 2,
    backgroundColor,
  } = options;

  const readNodes =
    typeof nodesOrGetter === "function" ? nodesOrGetter : () => nodesOrGetter;

  if (!readNodes() || readNodes().length === 0) {
    throw new Error("Cannot export: diagram is empty.");
  }

  const flowEl = document.querySelector(".react-flow");
  if (!flowEl) {
    throw new Error("React Flow element not found.");
  }

  // Cari global SVG markers (untuk Use Case Edge)
  const globalMarkersSvg = document.querySelector("svg[aria-hidden='true']");
  let clonedMarkers = null;
  if (globalMarkersSvg) {
  // Clone marker defs ke dalam React Flow edges SVG supaya ke-capture
    const edgesSvg = flowEl.querySelector(".react-flow__edges");
    if (edgesSvg) {
      const defs = globalMarkersSvg.querySelector("defs");
      if (defs) {
      clonedMarkers = defs.cloneNode(true);
      edgesSvg.insertBefore(clonedMarkers, edgesSvg.firstChild);
    }
  }
}

  const viewportEl = flowEl.querySelector(".react-flow__viewport");
  if (!viewportEl) {
    throw new Error("React Flow viewport not found.");
  }

  // Tunggu node terukur & marker tersuntik sebelum membaca bounds.
  await waitUntilReady(flowEl, readNodes);

  // Hitung bounds & ukuran output
  const nodesBounds = getNodesBounds(readNodes());
  if (nodesBounds.width === 0 || nodesBounds.height === 0) {
    throw new Error("Diagram is still rendering — try exporting again.");
  }
  const contentWidth = nodesBounds.width + padding * 2;
  const contentHeight = nodesBounds.height + padding * 2;
  const outputWidth = Math.max(contentWidth, minWidth);
  const outputHeight = Math.max(contentHeight, minHeight);

  // Hitung viewport transform (API baru: return object, bukan array)
  const viewport = getViewportForBounds(
    nodesBounds,
    outputWidth,
    outputHeight,
    0.5,
    2,
    padding,
  );

  // Resolve background color
  const rootStyle = getComputedStyle(document.documentElement);
  const resolvedBg =
    backgroundColor ||
    rootStyle.getPropertyValue("--bg-base").trim() ||
    "#ffffff";

  // Simpan state original
  const originalTransform = viewportEl.style.transform;

  let restoreSvgVars = null;

  try {
    // Set viewport ke posisi export
    viewportEl.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

    // Tunggu browser apply transform
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Resolve CSS var di SVG
    restoreSvgVars = resolveSvgCssVars(flowEl);

    // Snapshot
    const dataUrl = await toPng(flowEl, {
      backgroundColor: resolvedBg,
      width: outputWidth,
      height: outputHeight,
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
      filter: (node) => {
  if (!node.classList) return true;

  // Selalu allow edges layer & children-nya (edge paths, markers, labels)
  if (
    node.classList.contains("react-flow__edges") ||
    node.classList.contains("react-flow__edge") ||
    node.classList.contains("react-flow__edge-path") ||
    node.classList.contains("react-flow__edge-label") ||
    node.tagName === "marker" ||
    node.tagName === "defs"
  ) {
    return true;
  }

  // Allow SVG shapes that are part of edges (not nodes)
  // Node shapes have react-flow__node class on parent, edge shapes don't
  const isEdgeElement = node.closest?.('.react-flow__edge') !== null;
  if (isEdgeElement && (
    node.tagName === "path" ||
    node.tagName === "line" ||
    node.tagName === "polygon" ||
    node.tagName === "polyline" ||
    node.tagName === "circle" ||
    node.tagName === "ellipse" ||
    node.tagName === "text"
  )) {
    return true;
  }

  const skipClasses = [
    "react-flow__controls",
    "react-flow__minimap",
    "react-flow__attribution",
    "react-flow__panel",
    "react-flow__background",
    "react-flow__resize-control",
  ];

  for (const cls of skipClasses) {
    if (node.classList.contains(cls)) return false;
  }

  // Placeholder label relationship Architecture ("Description [technology]")
  // bukan isi diagram — jangan ikut ke PNG.
  if (node.classList.contains("arch-edge-placeholder")) return false;

  // Skip badge peringatan node (Flowchart + State Machine). Dicek lewat
  // atribut `title` karena badge hanya ada saat node berperingatan.
  if (node.getAttribute) {
    const title = node.getAttribute("title") || "";
    if (
      title === "Label cannot be empty" ||
      title === "Node is not connected to any process" ||
      title.startsWith("Decision should have") ||
      title.startsWith("State has no") ||
      title.startsWith("Final state cannot") ||
      title.startsWith("State machine has more than one") ||
      title.startsWith("Architecture:")
    ) {
      return false;
    }
  }

  return true;
},
    });

    // Download
    const link = document.createElement("a");
    link.download = pngFileName(filename);
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    if (restoreSvgVars) restoreSvgVars();
      viewportEl.style.transform = originalTransform;
    // Cleanup cloned markers
    if (clonedMarkers && clonedMarkers.parentNode) {
      clonedMarkers.parentNode.removeChild(clonedMarkers);
    }
  }
}