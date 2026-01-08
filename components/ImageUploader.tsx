import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { UploadedFile } from '../types';

interface ImageUploaderProps {
  onUpload: (file: UploadedFile) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onUpload({
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  return (
    <div className="w-full relative group">
      <input
        type="file"
        id="image-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <label
        htmlFor="image-upload"
        className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-gray-600 rounded-2xl bg-gray-800/50 cursor-pointer hover:bg-gray-800 hover:border-purple-500 transition-all duration-300 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="w-16 h-16 mb-4 rounded-full bg-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-8 h-8 text-purple-400" />
          </div>
          <p className="mb-2 text-lg text-gray-300 font-medium">Click to upload or drag & drop</p>
          <p className="text-sm text-gray-500">Supported formats: PNG, JPG, WEBP</p>
        </div>
      </label>
    </div>
  );
};
