#!/bin/bash
# AgentChain Guard Endpoint Verification Script
API_URL="https://agentguard-api-hnrutilnsq-uc.a.run.app"

echo "🔍 Checking API Health..."
curl -s "$API_URL/v1/health" | jq .

echo -e "\n🔍 Testing Policy Evaluation (Allowed Scenario)..."
curl -s -X POST "$API_URL/v1/intents/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "test-allowed-'"$(date +%s)"'",
    "agent": "DemoAgent",
    "requester": "DemoRequester",
    "recipient": "DemoRecipient",
    "amount": "3000000",
    "actionType": 0,
    "mint": "USDC"
  }' | jq .

echo -e "\n🔍 Testing Policy Evaluation (Blocked Scenario - High Amount)..."
curl -s -X POST "$API_URL/v1/intents/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "test-denied-'"$(date +%s)"'",
    "agent": "DemoAgent",
    "requester": "DemoRequester",
    "recipient": "DemoRecipient",
    "amount": "150000000",
    "actionType": 0,
    "mint": "USDC"
  }' | jq .

echo -e "\n✅ Verification Complete."
