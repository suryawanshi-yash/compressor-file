document.addEventListener('DOMContentLoaded', function() {
 // DOM Elements
 const uploadArea = document.getElementById('upload-area');
 const fileInput = document.getElementById('file-input');
 const filesList = document.getElementById('files-list');
 const resultsList = document.getElementById('results-list');
 const compressBtn = document.getElementById('compress-btn');
 const targetSizeInput = document.getElementById('target-size');
 const qualitySlider = document.getElementById('quality-slider');
 const qualityValue = document.getElementById('quality-value');
 const progressModal = document.getElementById('progress-modal');
 const progressBar = document.getElementById('progress-bar');
 const progressText = document.getElementById('progress-text');

 // State
 let files = [];
 let compressedFiles = [];

 // Event Listeners
 uploadArea.addEventListener('dragover', handleDragOver);
 uploadArea.addEventListener('dragleave', handleDragLeave);
 uploadArea.addEventListener('drop', handleDrop);
 fileInput.addEventListener('change', handleFileSelect);
 compressBtn.addEventListener('click', startCompression);
 qualitySlider.addEventListener('input', updateQualityValue);

 // Functions
 function handleDragOver(e) {
     e.preventDefault();
     uploadArea.classList.add('active');
 }

 function handleDragLeave(e) {
     e.preventDefault();
     uploadArea.classList.remove('active');
 }

 function handleDrop(e) {
     e.preventDefault();
     uploadArea.classList.remove('active');
     
     const droppedFiles = e.dataTransfer.files;
     processFiles(droppedFiles);
 }

 function handleFileSelect(e) {
     const selectedFiles = e.target.files;
     processFiles(selectedFiles);
 }

 function processFiles(selectedFiles) {
     for (let i = 0; i < selectedFiles.length; i++) {
         const file = selectedFiles[i];
         
         // Check if file is already in the list
         if (files.some(f => f.name === file.name && f.size === file.size)) {
             continue;
         }
         
         // Check if file type is supported
         const fileType = file.type.toLowerCase();
         if (fileType === 'application/pdf' || fileType.includes('jpeg') || fileType.includes('jpg')) {
             files.push(file);
         } else {
             showNotification('Unsupported file type. Only JPG, JPEG, and PDF are supported.', 'error');
         }
     }
     
     updateFilesList();
     updateCompressButton();
 }

 function updateFilesList() {
     if (files.length === 0) {
         filesList.innerHTML = '<p class="empty-message">No files selected</p>';
         return;
     }
     
     filesList.innerHTML = '';
     
     files.forEach((file, index) => {
         const fileItem = document.createElement('div');
         fileItem.className = 'file-item';
         
         let fileIcon = '';
         let filePreview = '';
         
         if (file.type.includes('pdf')) {
             fileIcon = '<i class="fas fa-file-pdf file-icon"></i>';
         } else {
             // Create image preview for images
             const objectUrl = URL.createObjectURL(file);
             filePreview = `<img src="${objectUrl}" class="file-preview" alt="Preview">`;
         }
         
         fileItem.innerHTML = `
             ${filePreview || fileIcon}
             <div class="file-info">
                 <div class="file-name">${file.name}</div>
                 <div class="file-size">${formatFileSize(file.size)}</div>
             </div>
             <div class="file-actions">
                 <button class="remove-btn" data-index="${index}">
                     <i class="fas fa-trash"></i>
                 </button>
             </div>
         `;
         
         filesList.appendChild(fileItem);
     });
     
     // Add event listeners to remove buttons
     document.querySelectorAll('.remove-btn').forEach(button => {
         button.addEventListener('click', function() {
             const index = parseInt(this.getAttribute('data-index'));
             removeFile(index);
         });
     });
 }

 function removeFile(index) {
     files.splice(index, 1);
     updateFilesList();
     updateCompressButton();
 }

 function updateCompressButton() {
     compressBtn.disabled = files.length === 0;
 }

 function updateQualityValue() {
     qualityValue.textContent = `${qualitySlider.value}%`;
 }

 async function startCompression() {
     if (files.length === 0) return;
     
     const targetSize = parseInt(targetSizeInput.value) * 1024; // Convert to bytes
     const quality = parseInt(qualitySlider.value) / 100;
     
     showProgressModal();
     compressedFiles = [];
     
     try {
         for (let i = 0; i < files.length; i++) {
             const file = files[i];
             const progress = Math.round(((i) / files.length) * 100);
             updateProgress(progress);
             
             let compressedFile;
             if (file.type.includes('pdf')) {
                 compressedFile = await compressPDF(file, targetSize);
             } else {
                 compressedFile = await compressImage(file, targetSize, quality);
             }
             
             compressedFiles.push({
                 original: file,
                 compressed: compressedFile
             });
         }
         
         updateProgress(100);
         setTimeout(() => {
             hideProgressModal();
             updateResultsList();
         }, 500);
         
     } catch (error) {
         console.error('Compression error:', error);
         hideProgressModal();
         showNotification('Error compressing files. Please try again.', 'error');
     }
 }

 async function compressImage(file, targetSize, quality) {
     const options = {
         maxSizeMB: targetSize / (1024 * 1024), // Convert to MB
         maxWidthOrHeight: 1920,
         useWebWorker: true,
         initialQuality: quality
     };
     
     try {
         //Import imageCompression library here.  For example:
         //import { imageCompression } from 'image-compression';
         const compressedBlob = await imageCompression(file, options);
         return new File([compressedBlob], file.name, {
             type: compressedBlob.type
         });
     } catch (error) {
         console.error('Image compression error:', error);
         throw error;
     }
 }

 async function compressPDF(file, targetSize) {
     try {
         //Import PDFLib library here. For example:
         //import { PDFLib } from 'pdf-lib';
         const arrayBuffer = await file.arrayBuffer();
         const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
         
         // Reduce quality until target size is reached or minimum quality is reached
         let quality = 0.9;
         let compressedPdf;
         let compressedSize;
         
         while (quality >= 0.1) {
             compressedPdf = await pdfDoc.save({ 
                 useObjectStreams: true,
                 compress: true
             });
             
             compressedSize = compressedPdf.length;
             
             if (compressedSize <= targetSize || quality <= 0.1) {
                 break;
             }
             
             quality -= 0.1;
         }
         
         return new File([compressedPdf], file.name, {
             type: 'application/pdf'
         });
     } catch (error) {
         console.error('PDF compression error:', error);
         throw error;
     }
 }

 function updateResultsList() {
     if (compressedFiles.length === 0) {
         resultsList.innerHTML = '<p class="empty-message">No compressed files yet</p>';
         return;
     }
     
     resultsList.innerHTML = '';
     
     compressedFiles.forEach((item, index) => {
         const original = item.original;
         const compressed = item.compressed;
         
         const originalSize = original.size;
         const compressedSize = compressed.size;
         const savings = originalSize - compressedSize;
         const savingsPercent = Math.round((savings / originalSize) * 100);
         
         let fileIcon = '';
         let filePreview = '';
         
         if (original.type.includes('pdf')) {
             fileIcon = '<i class="fas fa-file-pdf file-icon"></i>';
         } else {
             // Create image preview for images
             const objectUrl = URL.createObjectURL(compressed);
             filePreview = `<img src="${objectUrl}" class="file-preview" alt="Preview">`;
         }
         
         const resultItem = document.createElement('div');
         resultItem.className = 'result-item';
         
         resultItem.innerHTML = `
             ${filePreview || fileIcon}
             <div class="file-info">
                 <div class="file-name">${compressed.name}</div>
                 <div class="compression-info">
                     <span class="original-size">Original: ${formatFileSize(originalSize)}</span>
                     <span class="compressed-size">Compressed: ${formatFileSize(compressedSize)}</span>
                     <span class="savings">Saved: ${savingsPercent}%</span>
                 </div>
             </div>
             <button class="download-btn" data-index="${index}">
                 <i class="fas fa-download"></i> Download
             </button>
         `;
         
         resultsList.innerHTML = '';
         resultsList.appendChild(resultItem);
     });
     
     // Add event listeners to download buttons
     document.querySelectorAll('.download-btn').forEach(button => {
         button.addEventListener('click', function() {
             const index = parseInt(this.getAttribute('data-index'));
             downloadCompressedFile(index);
         });
     });
     
     // Show results section
     document.getElementById('results-section').style.display = 'block';
 }

 function downloadCompressedFile(index) {
     const compressedFile = compressedFiles[index].compressed;
     const url = URL.createObjectURL(compressedFile);
     
     const a = document.createElement('a');
     a.href = url;
     a.download = compressedFile.name;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
 }

 function showProgressModal() {
     progressModal.classList.add('show');
     updateProgress(0);
 }

 function hideProgressModal() {
     progressModal.classList.remove('show');
 }

 function updateProgress(percent) {
     progressBar.style.width = `${percent}%`;
     progressText.textContent = `${percent}%`;
 }

 function formatFileSize(bytes) {
     if (bytes === 0) return '0 Bytes';
     
     const k = 1024;
     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
     const i = Math.floor(Math.log(bytes) / Math.log(k));
     
     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 }

 function showNotification(message, type) {
     alert(message); // Simple alert for now
 }
});