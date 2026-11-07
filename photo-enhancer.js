let photoEdit = null;
let photoEditGeneration = 0;
let photoPreview = null;
let photoPreviewTimer = null;

// Local photographic adjustments. No generated content or external upload.
async function enhancePhotoBlob(original, strength) {
  const amount = Math.max(0, Math.min(100, Number(strength))) / 100;
  if (!amount) return original;
  const bitmap = await createImageBitmap(original);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.filter = `brightness(${1 + amount * .045}) contrast(${1 + amount * .09}) saturate(${1 + amount * .12})`;
    context.drawImage(bitmap, 0, 0); context.filter = 'none';
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const source = new Uint8ClampedArray(pixels.data);
    const stride = canvas.width * 4;
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const offset = y * stride + x * 4;
        for (let channel = 0; channel < 3; channel++) {
          const at = offset + channel;
          const detail = source[at] * 4 - source[at - 4] - source[at + 4] - source[at - stride] - source[at + stride];
          pixels.data[at] = Math.max(0, Math.min(255, source[at] + detail * .12 * amount));
        }
      }
    }
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
    if (!blob) throw new Error('Não foi possível gerar a melhoria.');
    return blob;
  } finally { bitmap.close(); }
}

function closePhotoEnhancer() {
  photoEditGeneration++;
  clearTimeout(photoPreviewTimer);
  if (photoEdit?.beforeUrl) URL.revokeObjectURL(photoEdit.beforeUrl);
  if (photoPreview?.url) URL.revokeObjectURL(photoPreview.url);
  photoEdit = null; photoPreview = null;
  $('#enhanceDialog').close();
}

async function refreshPhotoPreview() {
  const generation = ++photoEditGeneration;
  const editing = photoEdit;
  if (!editing) return;
  $('#applyEnhance').disabled = true;
  $('#enhanceStatus').textContent = 'Preparando a prévia…';
  try {
    const blob = await enhancePhotoBlob(editing.original, $('#enhanceStrength').value);
    if (generation !== photoEditGeneration || photoEdit !== editing) return;
    if (photoPreview?.url) URL.revokeObjectURL(photoPreview.url);
    photoPreview = { blob, url: URL.createObjectURL(blob) };
    $('#enhanceAfter').src = photoPreview.url;
    $('#enhanceStatus').textContent = 'Compare o resultado. A aplicação fica pendente até você salvar as fotos.';
    $('#applyEnhance').disabled = false;
  } catch (error) {
    if (generation === photoEditGeneration) $('#enhanceStatus').textContent = error.message;
  }
}

function openPhotoEnhancer(shot) {
  if (captureRunning || studioBusy) return;
  const entry = studioDraft.get(shot);
  if (!entry) return;
  const original = entry.originalBlob || entry.blob;
  photoEdit = { shot, original, vehicleId: studioVehicleId, studioGeneration, beforeUrl: URL.createObjectURL(original) };
  $('#enhanceBefore').src = photoEdit.beforeUrl;
  $('#enhanceAfter').src = entry.url;
  $('#enhanceStrength').value = 60;
  $('#enhanceStrengthValue').textContent = '60%';
  $('#restoreOriginal').disabled = !entry.originalBlob;
  $('#enhanceDialog').showModal();
  refreshPhotoPreview();
}

function applyPhotoPreview(restore = false) {
  if (!photoEdit || (!restore && !photoPreview)) return;
  if (captureRunning || studioBusy || photoEdit.vehicleId !== studioVehicleId || photoEdit.studioGeneration !== studioGeneration) { closePhotoEnhancer(); return; }
  const old = studioDraft.get(photoEdit.shot);
  if (!old) { closePhotoEnhancer(); return; }
  const blob = restore ? photoEdit.original : photoPreview.blob;
  const enhanced = !restore && Number($('#enhanceStrength').value) > 0;
  studioDraft.set(photoEdit.shot, { blob, url: URL.createObjectURL(blob), originalBlob: enhanced ? photoEdit.original : null, enhanced });
  URL.revokeObjectURL(old.url);
  closePhotoEnhancer();
  renderStudio();
  $('#studioStatus').textContent = restore ? 'Original restaurado. Salve as fotos para confirmar.' : 'Melhoria aplicada ao rascunho. Salve as fotos para confirmar.';
}

$('#studioGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-enhance-shot]');
  if (button) openPhotoEnhancer(button.dataset.enhanceShot);
});
$('#enhanceStrength').addEventListener('input', () => {
  $('#enhanceStrengthValue').textContent = `${$('#enhanceStrength').value}%`;
  $('#applyEnhance').disabled = true;
  photoEditGeneration++;
  clearTimeout(photoPreviewTimer);
  photoPreviewTimer = setTimeout(refreshPhotoPreview, 180);
});
$('#applyEnhance').addEventListener('click', () => applyPhotoPreview());
$('#restoreOriginal').addEventListener('click', () => applyPhotoPreview(true));
$('#closeEnhance').addEventListener('click', closePhotoEnhancer);
$('#enhanceDialog').addEventListener('cancel', event => { event.preventDefault(); closePhotoEnhancer(); });
