import React, { useState, ChangeEvent } from 'react';

interface ApiResponse {
  signedUrl: string;
}

interface UploadProps {
  fileName: string;
  contentType: string;
  expectedSize: number;
}

const PhotoUpload: React.FC = () => {

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const uploadData: UploadProps = {
      fileName: file.name,
      contentType: file.type,
      expectedSize: file.size,
    };

    try {
      // Post to your API to get the signed URL
      const response = await fetch('https://mrc1kr6ffe.execute-api.ap-southeast-2.amazonaws.com/prod/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadData)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch the signed URL');
      }

      const data: ApiResponse = await response.json();

      // Use the signed URL to upload the file
      const uploadResponse = await fetch(data.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (uploadResponse.ok) {
        setUploadStatus('Upload successful!');
      } else {
        throw new Error('Failed to upload the photo.');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadStatus('Error during upload: ' + error.message);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload}>Upload Photo</button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
};

export default PhotoUpload;
