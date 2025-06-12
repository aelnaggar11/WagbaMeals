#!/bin/bash

# Wagba Deployment Verification Script
# This script tests all critical deployment components

echo "🚀 Wagba Deployment Verification"
echo "================================="

# Configuration
BASE_URL="http://localhost:5000"
TEST_COOKIES="/tmp/wagba_test_cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing $description... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "%{http_code}" -b "$TEST_COOKIES" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" -c "$TEST_COOKIES" -b "$TEST_COOKIES" "$BASE_URL$endpoint")
    fi
    
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($status_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} ($status_code) - Expected: $expected_status"
        echo "Response: $response_body"
        return 1
    fi
}

# Start tests
echo ""
echo "1. Testing Database Connection..."
test_endpoint "GET" "/api/weeks" "" 200 "Database connectivity"

echo ""
echo "2. Testing User Authentication..."

# User Registration
test_endpoint "POST" "/api/auth/register" '{
    "username": "testdeploy",
    "password": "deploy123",
    "email": "test@deploy.com",
    "name": "Test Deploy User",
    "phone": "+201234567890",
    "address": "{\"street\":\"Test Street\",\"building\":\"123\",\"apartment\":\"4A\",\"area\":\"Test Area\",\"landmark\":\"Test Mall\"}"
}' 201 "User registration"

# User Login
test_endpoint "POST" "/api/auth/login" '{
    "email": "test@deploy.com",
    "password": "deploy123"
}' 200 "User login"

# Session persistence
test_endpoint "GET" "/api/auth/me" "" 200 "Session persistence"

echo ""
echo "3. Testing Admin Authentication..."

# Admin Login
test_endpoint "POST" "/api/admin/auth/login" '{
    "username": "admin",
    "password": "password"
}' 200 "Admin login"

# Admin session
test_endpoint "GET" "/api/admin/auth/me" "" 200 "Admin session"

echo ""
echo "4. Testing Core Functionality..."

# Meals endpoint
test_endpoint "GET" "/api/meals" "" 200 "Meals retrieval"

# Order creation
test_endpoint "POST" "/api/orders" '{
    "weekId": 1,
    "mealCount": 3,
    "defaultPortionSize": "standard",
    "totalPrice": 747,
    "items": [
        {"mealId": 1, "portionSize": "standard"},
        {"mealId": 2, "portionSize": "standard"}
    ]
}' 201 "Order creation"

echo ""
echo "5. Testing Session Storage..."

# Store meal selections
test_endpoint "POST" "/api/temp/meal-selections" '{
    "weekId": 1,
    "mealCount": 3,
    "portionSize": "standard",
    "selectedMeals": [
        {"mealId": 1, "portionSize": "standard"},
        {"mealId": 2, "portionSize": "standard"}
    ]
}' 200 "Meal selection storage"

# Retrieve meal selections
test_endpoint "GET" "/api/temp/meal-selections" "" 200 "Meal selection retrieval"

echo ""
echo "================================="
echo "✅ Deployment verification complete!"
echo ""
echo "🔧 Production Checklist:"
echo "• Ensure DATABASE_URL is set correctly"
echo "• Set SESSION_SECRET to a secure random string"
echo "• Configure HTTPS for secure cookies"
echo "• Change default admin password"
echo "• Verify domain configuration"
echo ""
echo "📋 Default Credentials:"
echo "• Admin: username=admin, password=password"
echo "• Change immediately after deployment!"

# Cleanup
rm -f "$TEST_COOKIES"