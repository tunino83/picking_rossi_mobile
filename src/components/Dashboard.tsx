import React, { useState, useEffect } from "react";
import { ArrowUpRight, Users, DollarSign, ShoppingCart ,Package, PackageMinus, CheckCircle} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Order, OrderRow, User } from "../types";
import { apiClient } from "../lib/api";


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);



// Helper function to generate random data
const generateTimeSeriesData = (days: number) => {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    value: Math.floor(Math.random() * 50) + 20,
  }));
};

const orderTrendData = generateTimeSeriesData(30);

export function Dashboard() {

    const [orders, setOrder] = useState<Order[]>([]); // inizialmente vuoto
  
    useEffect(() => {
      async function fetchOrders() {
        try {
          const response = await apiClient.getOrders();
          setOrder(response.orders); // prendiamo solo la lista di ordini
        } catch (error) {
          console.error("Failed to fetch order list:", error);
        }
      }
  
      fetchOrders();
    }, []);
  

  const ordersByStatus = {
    notStarted: orders.filter(order => order.STATUS === 'NOT STARTED').length,
    inProgress: orders.filter(order => order.STATUS === 'IN PROGRESS').length,
    completed: orders.filter(order => order.STATUS === 'COMPLETED').length,
  };

  const stats = [
  { name: 'Unassigned', value: orders.filter(order => order.ASSIGNED_USER_ID= -1).length, icon: Package},
  { name: 'Not Started', value: ordersByStatus.notStarted, icon: PackageMinus },
  { name: 'In Progress', value: ordersByStatus.inProgress, icon: ShoppingCart},
  { name: 'Completed', value: ordersByStatus.completed, icon: CheckCircle},
  ]  ;

  const ordersByUser: { [key: string]: number } = orders.reduce((acc, order) => {
    const userId = order.ASSIGNED_USER_NAME!;
    if (userId) {
      acc[userId] = (acc[userId] || 0) + 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  const averageProcessingTime = 24; // In hours, this would come from actual data

  const chartData = {
    orderTrend: {
      labels: orderTrendData.map(d => d.date),
      datasets: [
        {
          label: 'Open List',
          data: orderTrendData.map(d => d.value),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
        {
          label: 'Closed Items',
          data: orderTrendData.map(d => d.value * (Math.random() * 0.4 + 0.1)),
          borderColor: 'rgba(247, 255, 10, 1)',
          tension: 0.1,
        },
        {
          label: 'Closed Lists',
          data: orderTrendData.map(d => d.value * (Math.random() * 0.9 + 0.1)),
          borderColor: 'rgba(75, 192, 91, 1)',
          tension: 0.1,
        }
      ],
    },
    orderStatus: {
      labels: ['NOT STARTED', 'IN PROGRESS', 'COMPLETED'],
      datasets: [
        {
          data: [ordersByStatus.notStarted, ordersByStatus.inProgress, ordersByStatus.completed],
          backgroundColor: ['#FFA500', '#3B82F6', '#10B981'],
        },
      ],
    },
    orderUser: {
      labels: Object.keys(ordersByUser),
      datasets: [
        {
          data:  Object.values(ordersByUser),
          backgroundColor: ['#FFA500', '#3B82F6', '#10B981'],
        },
      ],
    },
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* Order Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Trend (30 Days)</h3>
            <Line data={chartData.orderTrend} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
            }} />
          </div>

          {/* Order User Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items User Distribution</h3>
            <Doughnut data={chartData.orderUser} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
            }} />
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Distribution</h3>
            <Doughnut data={chartData.orderStatus} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
            }} />
          </div>


          

          {/* Average Processing Time Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Average Processing Time</h3>
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600">{averageProcessingTime}h</div>
                <div className="mt-2 text-gray-600">Average time from order to completion</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}