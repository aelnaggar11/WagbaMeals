import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  placeholder?: string;
}

export function ImageUpload({ value, onChange, label = "Image", placeholder = "Enter image URL or upload a file" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Get upload URL from backend
      const uploadResponse = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Step 2: Upload file directly to object storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Confirm upload and get public URL
      const confirmResponse = await fetch('/api/admin/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadURL })
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const { imageUrl } = await confirmResponse.json();
      
      // Update the form with the new image URL
      setUploadedImageUrl(imageUrl);
      onChange(imageUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully!"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    onChange(url);
    setUploadedImageUrl(""); // Clear uploaded image URL when manually entering URL
  };

  const clearImage = () => {
    onChange("");
    setUploadedImageUrl("");
  };

  const displayUrl = uploadedImageUrl || value;

  return (
    <div className="space-y-4">
      <Label htmlFor="image-upload">{label}</Label>
      
      {/* Image Preview */}
      {displayUrl && (
        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
          <img 
            src={displayUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // If image fails to load, show error state
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 mb-2" />
              <p>Failed to load image</p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <Input
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={handleUrlChange}
          className="w-full"
        />
        <p className="text-sm text-gray-500">Or upload a file below</p>
      </div>

      {/* File Upload */}
      <div className="flex items-center gap-4">
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('image-upload')?.click()}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </Button>
        {isUploading && (
          <div className="text-sm text-gray-600">
            Uploading image...
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Supported formats: JPG, PNG, GIF. Max size: 5MB
      </p>
    </div>
  );
}