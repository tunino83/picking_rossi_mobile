import React,{ useEffect, useState} from 'react';
import { useParams } from 'react-router-dom';
import { User, Clock, CheckCircle, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Order } from "../types";
import { apiClient } from "../lib/api";

export function UserProfile() {
  const { userId } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  
  const [userOrders, setOrder] = useState<Order[]>([]); // inizialmente vuoto
  
    useEffect(() => {
      async function fetchOrders() {
        try {
          const response = await apiClient.getUserOrders( parseInt(userId!) );
          setOrder(response.orders); // prendiamo solo la lista di ordini
        } catch (error) {
          console.error("Failed to fetch order list:", error);
        }
      }
  
      fetchOrders();
    }, []);
  
  
  const ordersByStatus = {
    notStarted: userOrders.filter(order => order.STATUS === 'NOT STARTED').length,
    inProgress: userOrders.filter(order => order.STATUS === 'IN PROGRESS').length,
    completed: userOrders.filter(order => order.STATUS === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 p-3 rounded-full">
            <User className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{currentUser?.name}</h2>
            <p className="text-gray-500">{currentUser?.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-2"
              style={{
                backgroundColor: currentUser?.role === 'admin' ? '#F3E8FF' : 
                              currentUser?.role === 'warehouse' ? '#DBEAFE' : '#ECFDF5',
                color: currentUser?.role === 'admin' ? '#6B21A8' : 
                       currentUser?.role === 'warehouse' ? '#1E40AF' : '#065F46'
              }}>
              {currentUser?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Package className="h-10 w-10 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-700">{userOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Package className="h-10 w-10 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Not Started</h3>
              <p className="text-3xl font-bold text-gray-700">{ordersByStatus.notStarted}</p>
            </div>
          </div>
        </div>


        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="h-10 w-10 text-yellow-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
              <p className="text-3xl font-bold text-gray-700">{ordersByStatus.inProgress}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
              <p className="text-3xl font-bold text-gray-700">{ordersByStatus.completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {userOrders.map((order) => (
            <div key={order.LIST_HEADER_ID} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{order.LIST_HEADER_ID}</h4>
                  <p className="text-sm text-gray-500">{order.LIST_TYPE_DESCRIPTION}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={{
                    backgroundColor: order.STATUS === 'completed' ? '#DEF7EC' : 
                                  order.STATUS === 'processing' ? '#E1EFFE' : '#FEF3C7',
                    color: order.STATUS === 'completed' ? '#03543F' : 
                          order.STATUS === 'processing' ? '#1E429F' : '#92400E'
                  }}>
                  {order.STATUS}
                </span>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Total Rows : {order.ROWS_COUNT} / Rows completed: {order.ROWS_IN_5} / Rows in progress: {order.ROWS_IN_1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}