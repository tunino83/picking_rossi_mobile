# Mobile App Integration Guide

## Overview
This backend provides REST API endpoints that can be consumed by mobile applications (iOS, Android, React Native, Flutter, etc.).

## Getting Started

### 1. Base Configuration
```javascript
const API_BASE_URL = 'https://your-project.supabase.co/functions/v1';
```

### 2. Authentication Flow

#### Step 1: Login
```javascript
const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.requiresVerification) {
    // Show 2FA code input screen
    return { requiresVerification: true };
  }
  
  return data;
};
```

#### Step 2: Verify 2FA Code
```javascript
const verify2FA = async (email, code) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store token securely
    await storeToken(data.token);
    return data.user;
  }
  
  throw new Error(data.error);
};
```

### 3. Making Authenticated Requests

```javascript
const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const token = await getStoredToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    // Token expired, redirect to login
    await clearToken();
    redirectToLogin();
    return;
  }
  
  return response.json();
};
```

### 4. Common Operations

#### Get User Orders
```javascript
const getUserOrders = async () => {
  return await makeAuthenticatedRequest('/orders');
};
```

#### Update Order Status
```javascript
const updateOrderStatus = async (orderId, status) => {
  return await makeAuthenticatedRequest('/orders/status', {
    method: 'PUT',
    body: JSON.stringify({ orderId, status })
  });
};
```

#### Update Product Status
```javascript
const updateProductStatus = async (orderId, productId, status) => {
  return await makeAuthenticatedRequest('/orders/product-status', {
    method: 'PUT',
    body: JSON.stringify({ orderId, productId, status })
  });
};
```

#### Search Products
```javascript
const searchProducts = async (query) => {
  return await makeAuthenticatedRequest(`/products/search?q=${encodeURIComponent(query)}`);
};
```

## React Native Example

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch('https://your-project.supabase.co/functions/v1/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch('https://your-project.supabase.co/functions/v1/orders/status', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      
      // Reload orders
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const renderOrder = ({ item }) => (
    <View style={{ padding: 16, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.title}</Text>
      <Text>{item.description}</Text>
      <Text>Status: {item.status}</Text>
      
      <TouchableOpacity
        onPress={() => updateOrderStatus(item.id, 'processing')}
        style={{ backgroundColor: 'blue', padding: 8, marginTop: 8 }}
      >
        <Text style={{ color: 'white' }}>Mark as Processing</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <FlatList
      data={orders}
      renderItem={renderOrder}
      keyExtractor={(item) => item.id}
    />
  );
};

export default OrdersScreen;
```

## Flutter Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://your-project.supabase.co/functions/v1';
  
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('authToken');
  }
  
  Future<Map<String, String>> getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
  
  Future<List<Order>> () async {
    final headers = await getHeaders();
    final response = await http.get(
      Uri.parse('$baseUrl/orders'),
      headers: headers,
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['orders'] as List)
          .map((order) => Order.fromJson(order))
          .toList();
    } else {
      throw Exception('Failed to load orders');
    }
  }
  
  Future<void> updateOrderStatus(String orderId, String status) async {
    final headers = await getHeaders();
    final response = await http.put(
      Uri.parse('$baseUrl/orders/status'),
      headers: headers,
      body: json.encode({
        'orderId': orderId,
        'status': status,
      }),
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to update order status');
    }
  }
}

class Order {
  final String id;
  final String title;
  final String description;
  final String status;
  
  Order({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
  });
  
  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: json['status'],
    );
  }
}
```

## Security Considerations

1. **Token Storage**: Store JWT tokens securely using:
   - iOS: Keychain Services
   - Android: EncryptedSharedPreferences
   - React Native: @react-native-keychain

2. **HTTPS Only**: Always use HTTPS for API calls

3. **Token Expiration**: Handle token expiration gracefully

4. **Input Validation**: Validate all user inputs before sending to API

5. **Error Handling**: Implement proper error handling for network issues

## Offline Support

Consider implementing offline support for mobile apps:

1. Cache frequently accessed data locally
2. Queue API calls when offline
3. Sync when connection is restored
4. Use libraries like Redux Persist or SQLite for local storage

## Push Notifications

To add push notifications for order updates:

1. Set up Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS)
2. Store device tokens in the user profile
3. Send notifications when order status changes
4. Handle notification taps to navigate to relevant screens