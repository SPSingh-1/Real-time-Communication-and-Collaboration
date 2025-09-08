import { useState } from "react";
import useAppContext from "../../context/useAppContext";

const UserProfile = () => {
  const { user, setUser } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  // Inside your UserProfile component:
const [previewOpen, setPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "user",
    createdAt: user?.createdAt || "",
    updatedAt: user?.updatedAt || "",
    photo: user?.photo || "",
    moreDetails: user?.moreDetails || "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [extraFile, setExtraFile] = useState(null);

  // handle text input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // handle profile photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);

      // preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // handle additional file upload
  const handleFileChange = (e) => {
    setExtraFile(e.target.files[0]);
  };

  // Save profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = new FormData();
      data.append("name", formData.name);

      if (photoFile) data.append("photo", photoFile);
      if (extraFile) data.append("extraFile", extraFile);
      if (!photoFile && !formData.photo) {
        data.append("removePhoto", "true");
    }


      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/userRouter/update/${user._id}`, {
        method: "PUT",
        body: data,
      });

      if (!res.ok) throw new Error("Failed to update profile");

      const updatedUser = await res.json();

      setUser(updatedUser);
      setFormData((prev) => ({
        ...prev,
        updatedAt: updatedUser.updatedAt,
        photo: updatedUser.photo,
        moreDetails: updatedUser.moreDetails,
      }));

      setMessage("✅ Profile updated successfully!");
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      setMessage("❌ Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-md text-white">
      <h2 className="text-2xl font-bold mb-6">User Profile</h2>

      {message && (
        <div
          className={`mb-4 p-2 rounded ${
            message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
       
       
        {/* Profile photo */}
        <div className="flex flex-col items-center text-white">
        {formData.photo ? (
            <div className="flex flex-col items-center text-white">
            {/* Profile image with click-to-preview */}
            <img
                src={formData.photo}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover mb-2 border cursor-pointer"
                onClick={() => setPreviewOpen(true)}
            />

            <div className="flex space-x-2">
                {/* Upload new photo */}
                <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="text-sm"
                />
                {/* Remove photo */}
                <button
                type="button"
                onClick={() => {
                    setFormData((prev) => ({ ...prev, photo: "" }));
                    setPhotoFile(null);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                Remove
                </button>
            </div>
            </div>
        ) : (
            <div className="flex flex-col items-center">
            {/* Dummy image */}
            <div className="w-28 h-28 bg-gray-300 rounded-full mb-2 flex items-center justify-center text-3xl">
                👤
            </div>
            {/* Upload new photo */}
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
        )}
        </div>

        {/* Full image preview modal */}
        {previewOpen && (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            onClick={() => setPreviewOpen(false)} // click anywhere to close
        >
            <img
            src={formData.photo}
            alt="Full Profile"
            className="max-w-full max-h-full rounded-lg shadow-lg"
            />
        </div>
        )}

        {/* Add more details file */}
        <div>
          <label className="block text-sm font-medium">Add More Details</label>
          <input type="file" onChange={handleFileChange} className="block mt-2" />
          {extraFile && <p className="text-sm mt-1">📂 {extraFile.name}</p>}
          {formData.moreDetails && !extraFile && (
            <p className="text-sm mt-1">
              📎 <a href={formData.moreDetails} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Uploaded File</a>
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={formData.email}
            readOnly
            className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed text-black"
          />
        </div>

        {/* Role (read-only) */}
        <div>
          <label className="block text-sm font-medium">Role</label>
          <input
            type="text"
            value={formData.role}
            readOnly
            className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed text-black"
          />
        </div>

        {/* Created At */}
        <div>
          <label className="block text-sm font-medium">Created At</label>
          <input
            type="text"
            value={formData.createdAt ? new Date(formData.createdAt).toLocaleString() : ""}
            readOnly
            className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed text-black"
          />
        </div>

        {/* Updated At */}
        <div>
          <label className="block text-sm font-medium">Last Updated</label>
          <input
            type="text"
            value={formData.updatedAt ? new Date(formData.updatedAt).toLocaleString() : ""}
            readOnly
            className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed text-black"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
