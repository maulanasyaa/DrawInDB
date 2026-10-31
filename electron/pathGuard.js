const path = require('path');
const fs = require('fs');

/**
 * Segmen path target relatif terhadap root, atau null kalau target tidak
 * benar-benar di dalam root. Pemeriksaan leksikal: path.resolve merapikan
 * `..`, jadi sisa segmen `..` berarti keluar dari root.
 */
function segmentsInside(root, target) {
  if (typeof root !== 'string' || !root) return null;
  if (typeof target !== 'string' || !target) return null;

  const rel = path.relative(path.resolve(root), path.resolve(target));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;

  const segs = rel.split(path.sep);
  if (segs.some((s) => !s || s === '.' || s === '..' || s === '.drawindb')) return null;
  return segs;
}

function isProjectScopedSegments(segs) {
  return !!segs && segs[0] === 'projects' && segs.length >= 2 && !segs[1].startsWith('.');
}

/** Hanya path di dalam <vault>/projects/<projectId>/... yang boleh dihapus. */
function isProjectScopedPath(vaultRoot, targetPath) {
  return isProjectScopedSegments(segmentsInside(vaultRoot, targetPath));
}

/**
 * Validasi sebelum memindahkan path ke Trash OS. Throw kalau vault belum
 * dibuka, path bukan di dalam project, atau realpath (setelah symlink diikuti)
 * keluar dari project yang sama.
 */
async function assertSafeToTrash(vaultRoot, targetPath) {
  if (!vaultRoot) throw new Error('Access denied: no vault is open');

  const lex = segmentsInside(vaultRoot, targetPath);
  if (!isProjectScopedSegments(lex)) {
    throw new Error('Access denied: path is not inside a project');
  }

  const [realRoot, realTarget] = await Promise.all([
    fs.promises.realpath(vaultRoot),
    fs.promises.realpath(path.resolve(targetPath)),
  ]);

  const real = segmentsInside(realRoot, realTarget);
  if (!isProjectScopedSegments(real) || real[1] !== lex[1]) {
    throw new Error('Access denied: path escapes the project folder');
  }
}

module.exports = { segmentsInside, isProjectScopedPath, assertSafeToTrash };
