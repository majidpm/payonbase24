import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useTheme } from '../contexts/ThemeContext';

export default function ImageCropper({ image, aspect, onDone, onCancel, isUploading }) {
  const { isDark } = useTheme();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [preview, setPreview] = useState(null);

  const onCropChange = (newCrop) => setCrop(newCrop);
  const onZoomChange = (newZoom) => setZoom(newZoom);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // ✅ ساخت preview
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', reject);
      img.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // ✅ دکمه Preview
  const handlePreview = async () => {
    if (!croppedAreaPixels) return;
    const cropped = await getCroppedImg(image, croppedAreaPixels, rotation);
    setPreview(cropped);
  };

  // ✅ دکمه Upload - مستقیم آپلود می‌کنه
  const handleUpload = async () => {
    if (!croppedAreaPixels) return;
    const cropped = await getCroppedImg(image, croppedAreaPixels, rotation);
    // مستقیم onDone رو صدا بزن (بدون setPreview)
    onDone(cropped);
  };

  // ✅ دکمه Back به Cropper
  const handleBack = () => {
    setPreview(null);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`rounded-2xl p-4 sm:p-6 max-w-2xl w-full my-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
           Adjust Image
        </h3>

        {!preview ? (
          // ✅ حالت Cropper
          <>
            {/* Cropper Area */}
            <div 
              className={`relative w-full bg-gray-800 rounded-xl overflow-hidden mb-4 ${
                aspect === 1 ? 'aspect-square max-h-80' : 'aspect-[3/1] max-h-60'
              }`}
            >
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                cropShape={aspect === 1 ? 'round' : 'rect'}
                showGrid={true}
              />
            </div>

            {/* Controls */}
            <div className="space-y-3 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  🔍 Zoom: {Math.round(zoom * 100)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  🔄 Rotation: {rotation}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Buttons - حالت Cropper */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isUploading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={isUploading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  isDark ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-500 text-white hover:bg-purple-600'
                } disabled:opacity-50`}
              >
                👁️ Preview
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {isUploading ? '⏳ Uploading...' : '✅ Upload'}
              </button>
            </div>
          </>
        ) : (
          // ✅ حالت Preview
          <>
            <div className={`rounded-xl overflow-hidden mb-4 border-2 ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <img 
                src={preview} 
                alt="Preview" 
                className={`w-full ${aspect === 1 ? 'aspect-square' : 'aspect-[3/1]'} object-cover`}
              />
            </div>

            <p className={`text-sm mb-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Does it look good?
            </p>

            {/* Buttons - حالت Preview */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isUploading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                🔄 Adjust
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {isUploading ? '⏳ Uploading...' : '✅ Upload'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}