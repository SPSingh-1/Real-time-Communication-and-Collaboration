import { useState } from "react";
import useAppContext from "../../context/useAppContext";

const UserProfile = () => {
  const { user, setUser } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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
    <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="mb-6 pb-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white mb-1">User Profile</h2>
          <p className="text-xs text-slate-400">Manage your account information and preferences</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-3 rounded-lg text-xs font-medium ${
              message.startsWith("✅") 
                ? "bg-emerald-950/50 border border-emerald-800 text-emerald-300" 
                : "bg-red-950/50 border border-red-800 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile photo */}
          <div className="flex flex-col items-center">
            {formData.photo ? (
              <div className="flex flex-col items-center">
                <img
                  src={formData.photo}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mb-3 border-2 border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewOpen(true)}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, photo: "" }));
                      setPhotoFile(null);
                    }}
                    className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-800 border border-slate-700 rounded-full mb-3 flex items-center justify-center text-3xl text-slate-400">
                  👤
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            )}
          </div>

          {/* Full image preview modal */}
          {previewOpen && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewOpen(false)}
            >
              <img
                src={formData.photo}
                alt="Full Profile"
                className="max-w-full max-h-[80vh] rounded-xl border border-slate-700 shadow-2xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role / Tier</label>
              <input
                type="text"
                value={formData.role}
                readOnly
                className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-sm text-slate-400 cursor-not-allowed capitalize"
              />
            </div>

            {/* Created At */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Member Since</label>
              <input
                type="text"
                value={formData.createdAt ? new Date(formData.createdAt).toLocaleDateString() : ""}
                readOnly
                className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Add more details file */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Additional Documents / Attachments</label>
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 bg-slate-950 p-2 border border-slate-800 rounded-lg"
            />
            {extraFile && <p className="text-xs text-slate-400 mt-1.5">📂 Selected: {extraFile.name}</p>}
            {formData.moreDetails && !extraFile && (
              <p className="text-xs text-slate-400 mt-1.5">
                📎 <a href={formData.moreDetails} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View Uploaded Attachment</a>
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs sm:text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
