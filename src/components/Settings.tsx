import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, AlertCircle } from "lucide-react";
import { Setting } from "../types";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/api";

export function Settings() {
  const [editedSettings, setEditedSettings] = useState<{
    [key: string]: string;
  }>({});
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const user = useAuthStore((state) => state.user);

  // Mock settings data - replace with Supabase calls
  const [settingList, setSettingList] = useState<Setting[]>([]); // inizialmente vuoto

  useEffect(() => {
    if (settingList.length > 0) {
      const initialEdited = settingList.reduce((acc, setting) => {
        acc[setting.id] = setting.value;
        return acc;
      }, {} as { [key: string]: string });

      setEditedSettings(initialEdited);
    }
  }, [settingList]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await apiClient.getSettings();
        setSettingList(response.settings); // prendiamo solo la lista di impostazioni
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    }

    fetchSettings();
  }, []);

  const handleSettingChange = (settingId: string, value: string) => {
    setEditedSettings((prev) => ({
      ...prev,
      [settingId]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaveStatus("saving");
    try {
      const editedArray: Array<{ id: string; value: string }> = Object.entries(
        editedSettings
      ).map(([id, value]) => ({ id, value }));
      let response = await apiClient.updateSettings(editedArray);

      const updatedSettings = settingList.map((setting) => ({
        ...setting,
        value: editedSettings[setting.id],
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      }));

      setSettingList(updatedSettings);
      setSaveStatus("success");

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p>You don't have permission to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SettingsIcon className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              System Settings
            </h3>
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${
                saveStatus === "saving"
                  ? "bg-gray-400"
                  : saveStatus === "success"
                  ? "bg-green-600"
                  : saveStatus === "error"
                  ? "bg-red-600"
                  : "bg-red-600 hover:bg-red-700"
              } 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "success"
              ? "Saved!"
              : saveStatus === "error"
              ? "Error!"
              : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="space-y-6">
          {settingList.map((setting) => (
            <div key={setting.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-2">
                <label
                  htmlFor={setting.id}
                  className="block text-sm font-medium text-gray-700"
                >
                  {setting.name}
                </label>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    id={setting.id}
                    value={editedSettings[setting.id] || ""}
                    onChange={(e) =>
                      handleSettingChange(setting.id, e.target.value)
                    }
                    className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(setting.updatedAt).toLocaleString()}{" "}
                  by {setting.updatedByName}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
