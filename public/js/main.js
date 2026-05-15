// Image preview before upload
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');

if (fileInput && previewContainer) {
  fileInput.addEventListener('change', () => {
    previewContainer.innerHTML = '';
    const files = Array.from(fileInput.files).slice(0, 6);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'preview';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
}
