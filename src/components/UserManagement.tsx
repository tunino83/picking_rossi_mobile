import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Warehouse,
} from "lucide-react";
import { User, Role, Warehouse as WH } from "../types";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api";
import { useTranslation } from "react-i18next";

export function UserManagement() {
  const { t } = useTranslation();

  //const [users, setUsers] = useState<User[]>(mockUsers);

  const [users, setUsers] = useState<User[]>([]); // inizialmente vuoto

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await apiClient.getUsers();
        setUsers(response.users); // prendiamo solo la lista di utenti
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }

    fetchUsers();
  }, []);

  const [warehouses, setWarehouses] = useState<WH[]>([]); // inizialmente vuoto
  useEffect(() => {
    async function fetchWarehouses() {
      try {
        const response = await apiClient.getWarehouses();
        setWarehouses(response.warehouses); // prendiamo solo la lista di magazzini
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
      }
    }

    fetchWarehouses();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [filterLastName, setFilterLastName] = useState("");
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [newUser, setNewUser] = useState({
    email: "",
    FIRST_NAME: "",
    LAST_NAME: "",
    WAREHOUSE_CODE: "",
    role: "" ,
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesLastName =
      !filterLastName ||
      user.LAST_NAME.toLowerCase().includes(filterLastName.toLowerCase());
    return matchesSearch && matchesRole && matchesLastName;
  });

  async function updateUserRole(userId: number, role: Role) {
    setUsers(
      users.map((user) => (user.id === userId ? { ...user, role } : user))
    );
  }

  async function updateUser(userId: number, updates: Partial<User>) {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...updates,
              name: `${updates.FIRST_NAME || user.FIRST_NAME} ${
                updates.LAST_NAME || user.LAST_NAME
              }`,
            }
          : user
      )
    );
  }

  async function handleAddUser(e: React.FormEvent) {

    e.preventDefault();
    let userToAdd = {
      id: -1,
      email: newUser.email,
      FIRST_NAME: newUser.FIRST_NAME,
      LAST_NAME: newUser.LAST_NAME,
      NAME: `${newUser.FIRST_NAME} ${newUser.LAST_NAME}`,
      WAREHOUSE_CODE: newUser.WAREHOUSE_CODE,
      role: newUser.role as Role,
      password: "admin123",
    };
    try {
      const response = await apiClient.createUser(userToAdd);

      userToAdd.id = parseInt(response.userId);
      setUsers([...users, userToAdd]);
      setShowNewUserForm(false);
      setNewUser({
        email: "",
        FIRST_NAME: "",
        LAST_NAME: "",
        WAREHOUSE_CODE: "",
        role: "orders",
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert(error);
    }

   
  }

  if (currentUser?.role !== "admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              User Management
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filter by last name..."
                value={filterLastName}
                onChange={(e) => setFilterLastName(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as Role | "all")}
                className="w-full sm:w-auto rounded-lg border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("users.roles.all")}</option>
                <option value="admin">{t("users.roles.admin")}</option>
                <option value="warehouse">{t("users.roles.warehouse")}</option>
                <option value="orders">{t("users.roles.orders")}</option>
                <option value="orders_closer">{t("users.roles.orders_closer")}</option>
              </select>
              <button
                onClick={() => setShowNewUserForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add User
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Warehouse
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <React.Fragment key={user.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.NAME}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "warehouse"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-gray-500">{user.WAREHOUSE_NAME}</div>
                    </td>
                    <td className="px-4 py-4 text-sm space-x-2">
                      <select
                        className="rounded-md border-gray-300 text-sm"
                        value={user.role}
                        onChange={(e) =>
                          updateUserRole(user.id, e.target.value as Role)
                        }
                      >
                        <option value="admin">{t("users.roles.admin")}</option>
                        <option value="warehouse">
                          {t("users.roles.warehouse")}
                        </option>
                        <option value="orders">
                          {t("users.roles.orders")}
                        </option>
                        <option value="orders_closer">
                          {t("users.roles.orders_closer")}
                        </option>
                      </select>
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {" "}
              {t("users.add")}
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("common.warehouse")}
                </label>
                <select
                  value={newUser.WAREHOUSE_CODE}
                  onChange={(e) =>
                    setNewUser({ ...newUser, WAREHOUSE_CODE: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                >
                  <option value="">{t("common.select_warehouse")}...</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.code} value={warehouse.code}>
                      {warehouse.code + " (" + warehouse.name + ") "}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as Role })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                >
                  <option value="">{t("common.select_role")}...</option>
                  <option value="orders">{t("users.roles.orders")}</option>
                  <option value="orders_closer">{t("users.roles.orders_closer")}</option>
                  <option value="warehouse">{t("users.roles.warehouse")}</option>
                  <option value="admin">{t("users.roles.admin")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.FIRST_NAME}
                  onChange={(e) =>
                    setNewUser({ ...newUser, FIRST_NAME: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.LAST_NAME}
                  onChange={(e) =>
                    setNewUser({ ...newUser, LAST_NAME: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
