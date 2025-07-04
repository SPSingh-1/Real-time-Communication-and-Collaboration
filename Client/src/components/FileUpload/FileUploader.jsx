const FileUploader = () => {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    console.log("Uploaded:", file.name);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">File Upload</h2>
      <input type="file" onChange={handleFileUpload} />
    </div>
  );
};
export default FileUploader;
