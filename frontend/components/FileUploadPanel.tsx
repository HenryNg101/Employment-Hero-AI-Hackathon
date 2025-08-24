// "use client";
// import { useState } from "react";

// export default function FileUploadPanel() {
//   const [status, setStatus] = useState<string>("");

//   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!e.target.files?.length) return;
//     const file = e.target.files[0];

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("collection", "default");

//     setStatus("Uploading...");

//     try {
//       const res = await fetch("http://localhost:8000/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await res.json();
//       if (res.ok) {
//         setStatus(`✅ Uploaded. Chunks added: ${data.chunks_added}`);
//       } else {
//         setStatus(`❌ Error: ${data.detail}`);
//       }
//     } catch (err: any) {
//       setStatus(`❌ Upload failed: ${err.message}`);
//     }
//   };

//   return (
//     <div className="text-sm text-gray-700">
//       <h2 className="text-lg font-semibold mb-2">Upload Files</h2>
//       <input type="file" className="block mb-2" onChange={handleUpload} />
//       {status && <p>{status}</p>}
//     </div>
//   );
// }

'use client';
import { useState } from "react";

export default function FileUploadPanel() {
  const [status, setStatus] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("file", file); 
    formData.append("collection", "default");

    setStatus("Uploading...");

    try {
      const resp = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Upload failed");
      setStatus(`✅ Uploaded ${data.chunks_added} chunks`);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    }
  };

  return (
    <div className="text-sm text-gray-700">
      <h2 className="text-lg font-semibold mb-2">Upload File</h2>
      <input type="file" onChange={handleUpload} />
      <p className="mt-2">{status}</p>
    </div>
  );
}
